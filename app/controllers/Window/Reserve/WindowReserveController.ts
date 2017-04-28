import { FilmUtil, Models, ReservationUtil, ScreenUtil } from '@motionpicture/chevre-domain';
import { Util as GMOUtil } from '@motionpicture/gmo-service';
import * as moment from 'moment';
import * as _ from 'underscore';

import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/reserve/session';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

/**
 * 当日窓口座席予約コントローラー
 *
 * @export
 * @class WindowReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
export default class WindowReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup: string = ReservationUtil.PURCHASER_GROUP_WINDOW;
    public layout: string = 'layouts/window/layout';

    public async start(): Promise<void> {
        try {
            const reservationModel = await this.processStart();
            await reservationModel.save();

            if (reservationModel.performance !== undefined) {
                const cb = `/window/reserve/${reservationModel.token}/seats`;
                this.res.redirect(`/window/reserve/${reservationModel.token}/terms?cb=${encodeURIComponent(cb)}`);
            } else {
                const cb = `/window/reserve/${reservationModel.token}/performances`;
                this.res.redirect(`/window/reserve/${reservationModel.token}/terms?cb=${encodeURIComponent(cb)}`);
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
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                reservePerformanceForm(this.req);
                const validationResult = await this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                try {
                    // パフォーマンスFIX
                    reservationModel = await this.processFixPerformance(
                        (<ReservationModel>reservationModel),
                        this.req.body.performanceId
                    );
                    await reservationModel.save();
                    this.res.redirect(`/window/reserve/${token}/seats`);
                } catch (error) {
                    this.next(error);
                }

            } else {
                // 仮予約あればキャンセルする
                try {
                    reservationModel = await this.processCancelSeats(reservationModel);
                    await reservationModel.save();

                    this.res.render('window/reserve/performances', {
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
                reserveSeatForm(this.req);
                const validationResult = await this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.res.redirect(`/window/reserve/${token}/seats`);
                    return;
                }
                const seatCodes: string[] = JSON.parse(this.req.body.seatCodes);

                // 追加指定席を合わせて制限枚数を超過した場合
                if (seatCodes.length > limit) {
                    const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                    this.res.redirect(`/window/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
                    return;
                }

                // 仮予約あればキャンセルする
                try {
                    reservationModel = await this.processCancelSeats(<ReservationModel>reservationModel);
                } catch (error) {
                    this.next(error);
                    return;
                }

                try {
                    // 座席FIX
                    reservationModel = await this.processFixSeats(reservationModel, seatCodes);
                    await reservationModel.save();
                    // 券種選択へ
                    this.res.redirect(`/window/reserve/${token}/tickets`);
                } catch (error) {
                    await reservationModel.save();
                    const message = this.req.__('Message.SelectedSeatsUnavailable');
                    this.res.redirect(`/window/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
                    return;
                }
            } else {
                this.res.render('window/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit
                });
                return;
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
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
                    this.res.redirect(`/window/reserve/${token}/profile`);
                } catch (error) {
                    this.res.redirect(`/window/reserve/${token}/tickets`);
                }
            } else {
                this.res.render('window/reserve/tickets', {
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
                    this.res.redirect(`/window/reserve/${token}/confirm`);
                } catch (error) {
                    this.res.render('window/reserve/profile', {
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
                this.res.locals.paymentMethod = GMOUtil.PAY_TYPE_CREDIT;
                if (!_.isEmpty(reservationModel.paymentMethod)) {
                    this.res.locals.paymentMethod = reservationModel.paymentMethod;
                }

                this.res.render('window/reserve/profile', {
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
            const reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    await this.processConfirm(reservationModel);

                    // 予約確定
                    await this.processFixReservations(reservationModel.performance.day, reservationModel.paymentNo, {});
                    await reservationModel.remove();
                    console.log('redirecting to complete...');
                    this.res.redirect(`/window/reserve/${reservationModel.performance.day}/${reservationModel.paymentNo}/complete`);
                } catch (error) {
                    await reservationModel.remove();
                    this.next(error);
                }
            } else {
                this.res.render('window/reserve/confirm', {
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
        if (this.req.windowUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const reservations = await Models.Reservation.find(
                {
                    performance_day: this.req.params.performanceDay,
                    payment_no: this.req.params.paymentNo,
                    status: ReservationUtil.STATUS_RESERVED,
                    window: this.req.windowUser.get('_id'),
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

            this.res.render('window/reserve/complete', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
