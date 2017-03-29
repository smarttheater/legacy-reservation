import { FilmUtil, Models, ReservationUtil, ScreenUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as lockFile from 'lockfile';
import * as moment from 'moment';
import * as _ from 'underscore';

import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

const DEFAULT_RADIX = 10;

/**
 * 外部関係者座席予約コントローラー
 *
 * @export
 * @class SponsorReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
export default class SponsorReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup: string = ReservationUtil.PURCHASER_GROUP_SPONSOR;
    public layout: string = 'layouts/sponsor/layout';

    public async start(): Promise<void> {
        // 期限指定
        if (moment() < moment(conf.get<string>('datetimes.reservation_start_sponsors'))) {
            this.next(new Error(this.req.__('Message.OutOfTerm')));
            return;
        }

        try {
            const reservationModel = await this.processStart();

            if (reservationModel.performance !== undefined) {
                await reservationModel.save();
                const cb = this.router.build('sponsor.reserve.seats', { token: reservationModel.token });
                this.res.redirect(
                    `${this.router.build('sponsor.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`
                );
            } else {
                await reservationModel.save();
                const cb = this.router.build('sponsor.reserve.performances', { token: reservationModel.token });
                this.res.redirect(
                    `${this.router.build('sponsor.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`
                );
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 規約(スキップ)
     */
    public terms(): void {
        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }

    /**
     * スケジュール選択
     */
    public async performances(): Promise<void> {
        if (this.req.sponsorUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const sponsorUser = this.req.sponsorUser;
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            // 仮予約あればキャンセルする
            reservationModel = await this.processCancelSeats(<ReservationModel>reservationModel);
            await reservationModel.save();

            // 外部関係者による予約数を取得
            const reservationsCount = await Models.Reservation.count(
                {
                    sponsor: sponsorUser.get('_id'),
                    status: { $in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_RESERVED] }
                }
            ).exec();

            if (parseInt(sponsorUser.get('max_reservation_count'), DEFAULT_RADIX) <= reservationsCount) {
                this.next(new Error(this.req.__('Message.NoMoreReservation')));
                return;
            }

            if (this.req.method === 'POST') {
                reservePerformanceForm(this.req, this.res, async () => {
                    if (this.req.form !== undefined && this.req.form.isValid) {
                        try {
                            // パフォーマンスFIX
                            reservationModel = await this.processFixPerformance(
                                <ReservationModel>reservationModel,
                                (<any>this.req.form).performanceId
                            );
                            await reservationModel.save();
                            this.res.redirect(this.router.build('sponsor.reserve.seats', { token: token }));
                        } catch (error) {
                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                    } else {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                });
            } else {
                this.res.render('sponsor/reserve/performances', {
                    FilmUtil: FilmUtil,
                    reservationsCount: reservationsCount
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 座席選択
     */
    // tslint:disable-next-line:max-func-body-length
    public async seats(): Promise<void> {
        if (this.req.sponsorUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const sponsorUser = this.req.sponsorUser;
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            // 外部関係者による予約数を取得
            // TODO ローカルファイルロック以外の方法を考える
            const lockPath = `${__dirname}/../../../../lock/SponsorFixSeats${sponsorUser.get('_id')}.lock`;
            lockFile.lockSync(lockPath, {});

            const reservationsCount = await Models.Reservation.count(
                {
                    sponsor: sponsorUser.get('_id'),
                    status: { $in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_RESERVED] },
                    seat_code: {
                        $nin: (<ReservationModel>reservationModel).seatCodes // 現在のフロー中の予約は除く
                    }
                }
            ).exec();

            // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
            const reservableCount = parseInt(sponsorUser.get('max_reservation_count'), DEFAULT_RADIX) - reservationsCount;
            const limit = Math.min((<ReservationModel>reservationModel).getSeatsLimit(), reservableCount);

            // すでに枚数制限に達している場合
            if (limit <= 0) {
                lockFile.unlockSync(lockPath);
                this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() })));
                return;
            }

            if (this.req.method === 'POST') {
                reserveSeatForm(this.req, this.res, async () => {
                    reservationModel = <ReservationModel>reservationModel;

                    if (this.req.form !== undefined && this.req.form.isValid) {
                        const seatCodes: string[] = JSON.parse((<any>this.req.form).seatCodes);

                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            lockFile.unlockSync(lockPath);
                            const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                            this.res.redirect(
                                `${this.router.build('sponsor.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`
                            );
                            return;
                        }

                        // 仮予約あればキャンセルする
                        try {
                            reservationModel = await this.processCancelSeats(reservationModel);
                        } catch (error) {
                            this.next(error);
                            return;
                        }

                        try {
                            // 座席FIX
                            reservationModel = await this.processFixSeats(reservationModel, seatCodes);
                            lockFile.unlockSync(lockPath);
                            await reservationModel.save();
                            // 券種選択へ
                            this.res.redirect(this.router.build('sponsor.reserve.tickets', { token: token }));
                        } catch (error) {
                            await reservationModel.save();
                            const message = this.req.__('Message.SelectedSeatsUnavailable');
                            this.res.redirect(
                                `${this.router.build('sponsor.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`
                            );
                        }
                    } else {
                        lockFile.unlockSync(lockPath);
                        this.res.redirect(this.router.build('sponsor.reserve.seats', { token: token }));
                    }
                });
            } else {
                lockFile.unlockSync(lockPath);
                this.res.render('sponsor/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit,
                    reservableCount: reservableCount
                });
            }
        } catch (error) {
            console.error(error);
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 券種選択
     */
    public async tickets(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processFixTickets(reservationModel);
                    await reservationModel.save();
                    this.res.redirect(this.router.build('sponsor.reserve.profile', { token: token }));
                } catch (error) {
                    this.res.redirect(this.router.build('sponsor.reserve.tickets', { token: token }));
                }
            } else {
                this.res.render('sponsor/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 購入者情報
     */
    public async profile(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processFixProfile(reservationModel);
                    await reservationModel.save();
                    this.res.redirect(this.router.build('sponsor.reserve.confirm', { token: token }));
                } catch (error) {
                    this.res.render('sponsor/reserve/profile', {
                        reservationModel: reservationModel
                    });
                }
            } else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.purchaserEmail;
                this.res.locals.lastName = reservationModel.purchaserLastName;
                this.res.locals.firstName = reservationModel.purchaserFirstName;
                this.res.locals.tel = reservationModel.purchaserTel;
                this.res.locals.age = reservationModel.purchaserAge;
                this.res.locals.address = reservationModel.purchaserAddress;
                this.res.locals.gender = reservationModel.purchaserGender;
                this.res.locals.email = (!_.isEmpty(email)) ? email : '';
                this.res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod = (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : '';

                this.res.render('sponsor/reserve/profile', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約内容確認
     */
    public async confirm(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processConfirm(reservationModel);

                    // 予約確定
                    await this.processFixReservations(reservationModel.paymentNo, {});
                    await reservationModel.remove();
                    this.logger.info('redirecting to complete...');
                    this.res.redirect(this.router.build('sponsor.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                } catch (error) {
                    await reservationModel.remove();
                    this.next(error);
                }
            } else {
                this.res.render('sponsor/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    public async complete(): Promise<void> {
        if (this.req.sponsorUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const paymentNo = this.req.params.paymentNo;
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_RESERVED,
                    sponsor: this.req.sponsorUser.get('_id'),
                    purchased_at: { // 購入確定から30分有効
                        $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
                    }
                }
            ).exec();

            if (reservations.length === 0) {
                this.next(new Error(this.req.__('Message.NotFound')));
                return;
            }

            reservations.sort((a, b) => {
                return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });

            this.res.render('sponsor/reserve/complete', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
