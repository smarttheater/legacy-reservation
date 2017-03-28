import { Models } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';
import { FilmUtil } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as moment from 'moment';
import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

/**
 * 内部関係者座席予約コントローラー
 *
 * @export
 * @class StaffReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
export default class StaffReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup: string = ReservationUtil.PURCHASER_GROUP_STAFF;
    public layout: string = 'layouts/staff/layout';

    public async start(): Promise<void> {
        // 期限指定
        if (moment() < moment(conf.get<string>('datetimes.reservation_start_staffs'))) {
            return this.next(new Error(this.req.__('Message.OutOfTerm')));
        }

        try {
            const reservationModel = await this.processStart();
            await reservationModel.save();

            if (reservationModel.performance !== undefined) {
                const cb = this.router.build('staff.reserve.seats', { token: reservationModel.token });
                this.res.redirect(`${this.router.build('staff.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
            } else {
                const cb = this.router.build('staff.reserve.performances', { token: reservationModel.token });
                this.res.redirect(`${this.router.build('staff.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 規約(スキップ)
     */
    public terms(): void {
        const cb = (this.req.query.cb !== undefined && this.req.query.cb !== '') ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }

    /**
     * スケジュール選択
     */
    public async performances(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                reservePerformanceForm(this.req, this.res, async () => {
                    if (this.req.form !== undefined && this.req.form.isValid) {
                        try {
                            // パフォーマンスFIX
                            reservationModel = await this.processFixPerformance(<ReservationModel>reservationModel, (<any>this.req.form).performanceId);
                            await reservationModel.save();
                            this.res.redirect(this.router.build('staff.reserve.seats', { token: token }));
                        } catch (error) {
                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                    } else {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                });
            } else {
                // 仮予約あればキャンセルする
                reservationModel = await this.processCancelSeats(<ReservationModel>reservationModel);
                await reservationModel.save();

                this.res.render('staff/reserve/performances', {
                    FilmUtil: FilmUtil
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 座席選択
     */
    public async seats(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            const limit = reservationModel.getSeatsLimit();

            if (this.req.method === 'POST') {
                reserveSeatForm(this.req, this.res, async () => {
                    reservationModel = <ReservationModel>reservationModel;

                    if (this.req.form && this.req.form.isValid) {

                        const seatCodes: string[] = JSON.parse((<any>this.req.form).seatCodes);

                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                            this.res.redirect(`${this.router.build('staff.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
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
                            await reservationModel.save();
                            // 券種選択へ
                            this.res.redirect(this.router.build('staff.reserve.tickets', { token: token }));
                        } catch (error) {
                            await reservationModel.save();
                            const message = this.req.__('Message.SelectedSeatsUnavailable');
                            this.res.redirect(`${this.router.build('staff.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                        }
                    } else {
                        this.res.redirect(this.router.build('staff.reserve.seats', { token: token }));
                    }
                });
            } else {
                this.res.render('staff/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit
                });
            }
        } catch (error) {
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
                    this.res.redirect(this.router.build('staff.reserve.profile', { token: token }));
                } catch (error) {
                    this.res.redirect(this.router.build('staff.reserve.tickets', { token: token }));
                }
            } else {
                this.res.render('staff/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 購入者情報(スキップ)
     */
    public async profile(): Promise<void> {
        try {
            const token = this.req.params.token;
            const reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            this.res.redirect(this.router.build('staff.reserve.confirm', { token: token }));
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
                    this.res.redirect(this.router.build('staff.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                } catch (error) {
                    await reservationModel.remove();
                    this.next(error);
                }
            } else {
                this.res.render('staff/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    public async complete(): Promise<void> {
        if (this.req.staffUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const paymentNo = this.req.params.paymentNo;
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_RESERVED,
                    staff: this.req.staffUser.get('_id'),
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

            this.res.render('staff/reserve/complete', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約フロー中の座席をキャンセルするプロセス
     *
     * @override
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected async processCancelSeats(reservationModel: ReservationModel): Promise<ReservationModel> {
        const seatCodesInSession = (reservationModel.seatCodes) ? reservationModel.seatCodes : [];
        if (seatCodesInSession.length === 0) {
            return reservationModel;
        }

        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];

        // 仮予約をCHEVRE確保ステータスに戻す
        try {
            await Models.Reservation.update(
                {
                    performance: reservationModel.performance._id,
                    seat_code: { $in: seatCodesInSession },
                    status: ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE
                },
                {
                    $set: {
                        status: ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    },
                    $unset: {
                        staff: ''
                    }
                },
                {
                    multi: true
                }
            ).exec();

            // 仮予約を空席ステータスに戻す
            await Models.Reservation.remove(
                {
                    performance: reservationModel.performance._id,
                    seat_code: { $in: seatCodesInSession },
                    status: ReservationUtil.STATUS_TEMPORARY
                }
            ).exec();
        } catch (error) {
            // 失敗したとしても時間経過で消えるので放置
        }

        return reservationModel;
    }

    /**
     * 座席をFIXするプロセス
     *
     * @override
     */
    protected async processFixSeats(reservationModel: ReservationModel, seatCodes: string[]): Promise<ReservationModel> {
        if (this.req.staffUser === undefined) {
            throw new Error(this.req.__('Message.UnexpectedError'));
        }

        const staffUser = this.req.staffUser;

        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        reservationModel.expiredAt = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();

        // 新たな座席指定と、既に仮予約済みの座席コードについて
        const promises = seatCodes.map(async (seatCode) => {
            const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                return (seat.code === seatCode);
            });

            // 万が一、座席が存在しなかったら
            if (seatInfo === undefined) {
                throw new Error(this.req.__('Message.InvalidSeatCode'));
            }

            // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
            try {
                const reservation = await Models.Reservation.create(
                    {
                        performance: reservationModel.performance._id,
                        seat_code: seatCode,
                        status: ReservationUtil.STATUS_TEMPORARY,
                        expired_at: reservationModel.expiredAt,
                        staff: staffUser.get('_id')
                    }
                );

                // ステータス更新に成功したらセッションに保管
                reservationModel.seatCodes.push(seatCode);
                reservationModel.setReservation(seatCode, {
                    _id: reservation.get('_id'),
                    status: reservation.get('status'),
                    seat_code: reservation.get('seat_code'),
                    seat_grade_name_ja: seatInfo.grade.name.ja,
                    seat_grade_name_en: seatInfo.grade.name.en,
                    seat_grade_additional_charge: seatInfo.grade.additional_charge,
                    ticket_type_code: '',
                    ticket_type_name_ja: '',
                    ticket_type_name_en: '',
                    ticket_type_charge: 0,
                    watcher_name: ''
                });
            } catch (error) {
                // CHEVRE確保からの仮予約を試みる
                const reservation = await Models.Reservation.findOneAndUpdate(
                    {
                        performance: reservationModel.performance._id,
                        seat_code: seatCode,
                        status: ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    },
                    {
                        status: ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE,
                        expired_at: reservationModel.expiredAt,
                        staff: staffUser.get('_id')
                    },
                    {
                        new: true
                    }
                ).exec();

                if (reservation === null) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }

                // ステータス更新に成功したらセッションに保管
                reservationModel.seatCodes.push(seatCode);
                reservationModel.setReservation(seatCode, {
                    _id: reservation.get('_id'),
                    status: reservation.get('status'),
                    seat_code: reservation.get('seat_code'),
                    seat_grade_name_ja: seatInfo.grade.name.ja,
                    seat_grade_name_en: seatInfo.grade.name.en,
                    seat_grade_additional_charge: seatInfo.grade.additional_charge,
                    ticket_type_code: '',
                    ticket_type_name_ja: '',
                    ticket_type_name_en: '',
                    ticket_type_charge: 0,
                    watcher_name: ''
                });
            }
        });

        await Promise.all(promises);
        // 座席コードのソート(文字列順に)
        reservationModel.seatCodes.sort(ScreenUtil.sortBySeatCode);

        return reservationModel;
    }
}
