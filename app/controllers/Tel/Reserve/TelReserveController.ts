import { Models } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';
import { FilmUtil } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as moment from 'moment';
import * as GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

/**
 * 電話窓口座席予約コントローラー
 *
 * @export
 * @class TelReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
export default class TelReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup: string = ReservationUtil.PURCHASER_GROUP_TEL;
    public layout: string = 'layouts/tel/layout';

    public async start(): Promise<void> {
        try {
            const reservationModel = await this.processStart();

            // 購入番号発行(確認画面でペイデザイン川にコピーする際に必要になるので、事前に発行しておく)
            reservationModel.paymentNo = await ReservationUtil.publishPaymentNo();
            await reservationModel.save();

            if (reservationModel.performance !== undefined) {
                const cb = this.router.build('tel.reserve.seats', { token: reservationModel.token });
                this.res.redirect(`${this.router.build('tel.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
            } else {
                const cb = this.router.build('tel.reserve.performances', { token: reservationModel.token });
                this.res.redirect(`${this.router.build('tel.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
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
                            this.res.redirect(this.router.build('tel.reserve.seats', { token: token }));
                        } catch (error) {
                            this.next(error);
                        }
                    } else {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                });
            } else {
                // 仮予約あればキャンセルする
                try {
                    reservationModel = await this.processCancelSeats(reservationModel);
                    await reservationModel.save();

                    this.res.render('tel/reserve/performances', {
                        FilmUtil: FilmUtil
                    });
                } catch (error) {
                    this.next(error);
                }
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

                    if (this.req.form !== undefined && this.req.form.isValid) {
                        const seatCodes: string[] = JSON.parse((<any>this.req.form).seatCodes);

                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                            this.res.redirect(`${this.router.build('tel.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
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
                            this.res.redirect(this.router.build('tel.reserve.tickets', { token: token }));
                        } catch (error) {
                            await reservationModel.save();
                            const message = this.req.__('Message.SelectedSeatsUnavailable');
                            this.res.redirect(`${this.router.build('tel.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                        }
                    } else {
                        this.res.redirect(this.router.build('tel.reserve.seats', { token: token }));
                    }
                });
            } else {
                this.res.render('tel/reserve/seats', {
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

            reservationModel.paymentMethod = '';

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processFixTickets(reservationModel);
                    await reservationModel.save();
                    this.res.redirect(this.router.build('tel.reserve.profile', { token: token }));
                } catch (error) {
                    this.res.redirect(this.router.build('tel.reserve.tickets', { token: token }));
                }
            } else {
                this.res.render('tel/reserve/tickets', {
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
                    this.res.redirect(this.router.build('tel.reserve.confirm', { token: token }));
                } catch (error) {
                    this.res.render('tel/reserve/profile', {
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
                this.res.locals.email = (email) ? email : '';
                this.res.locals.emailConfirm = (email) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (email) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CVS;

                this.res.render('tel/reserve/profile', {
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
                    await Models.Reservation.update(
                        {
                            payment_no: reservationModel.paymentNo
                        },
                        {
                            status: ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN
                        },
                        {
                            multi: true
                        }
                    ).exec();

                    await reservationModel.remove();
                    this.logger.info('redirecting to complete...');
                    this.res.redirect(this.router.build('tel.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                } catch (error) {
                    await reservationModel.remove();
                    this.next(error);
                }
            } else {
                this.res.render('tel/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約完了
     */
    public async complete(): Promise<void> {
        if (this.req.telStaffUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const paymentNo = this.req.params.paymentNo;
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN,
                    tel_staff: this.req.telStaffUser.get('_id'),
                    purchased_at: { // 購入確定から30分有効
                        // tslint:disable-next-line:no-magic-numbers
                        $gt: moment().add(-30, 'minutes').toISOString()
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

            this.res.render('tel/reserve/complete', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
