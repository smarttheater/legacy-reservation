import { Models } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';
import { FilmUtil } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as httpStatus from 'http-status';
import * as moment from 'moment';

import * as GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

/**
 * 一般座席予約コントローラー
 *
 * @export
 * @class CustomerReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
export default class CustomerReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup: string = ReservationUtil.PURCHASER_GROUP_CUSTOMER;

    /**
     * スケジュール選択(本番では存在しない、実際はポータル側のページ)
     */
    public performances(): void {
        if (this.req.method === 'POST') {
            reservePerformanceForm(this.req, this.res, () => {
                if (this.req.form !== undefined && this.req.form.isValid) {
                    const performaceId = (<any>this.req.form).performanceId;
                    this.res.redirect(this.router.build('customer.reserve.start') + `?performance=${performaceId}&locale=${this.req.getLocale()}`);
                } else {
                    this.res.render('customer/reserve/performances');
                }
            });
        } else {
            this.res.render('customer/reserve/performances', {
                FilmUtil: FilmUtil
            });
        }
    }

    /**
     * ポータルからパフォーマンスと言語指定で遷移してくる
     */
    public async start(): Promise<void> {
        // MPのIPは許可
        // tslint:disable-next-line:no-empty
        if (this.req.headers['x-forwarded-for'] !== undefined && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
        } else {
            // 期限指定
            if (moment() < moment(conf.get<string>('datetimes.reservation_start_customers_first'))) {
                if (this.req.query.locale !== undefined && this.req.query.locale !== '') {
                    this.req.setLocale(this.req.query.locale);
                }

                this.next(new Error(this.req.__('Message.OutOfTerm')));
                return;
            }

            // 2次販売10分前より閉める
            if (moment() < moment(conf.get<string>('datetimes.reservation_start_customers_second')) &&
                moment() > moment(conf.get<string>('datetimes.reservation_start_customers_second')).add(-15, 'minutes') // tslint:disable-line:no-magic-numbers
            ) {
                if (this.req.query.locale !== undefined && this.req.query.locale !== '') {
                    this.req.setLocale(this.req.query.locale);
                }

                this.next(new Error(this.req.__('Message.OutOfTerm')));
                return;
            }
        }

        try {
            const reservationModel = await this.processStart();

            if (reservationModel.performance !== undefined) {
                await reservationModel.save();
                this.res.redirect(this.router.build('customer.reserve.terms', { token: reservationModel.token }));
            } else {
                // 今回は必ずパフォーマンス指定で遷移してくるはず
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                // reservationModel.save(() => {
                //     this.res.redirect(this.router.build('customer.reserve.performances', {token: reservationModel.token}));
                // });
            }
        } catch (error) {
            this.next(error);
        }
    }

    /**
     * 規約
     */
    public async terms(): Promise<void> {
        try {
            const token = this.req.params.token;
            const reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                this.res.redirect(this.router.build('customer.reserve.seats', { token: token }));
            } else {
                this.res.render('customer/reserve/terms');
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
                            this.res.redirect(`${this.router.build('customer.reserve.seats', { token: reservationModel.token })}?message=${encodeURIComponent(message)}`);
                        } else {
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
                                this.res.redirect(this.router.build('customer.reserve.tickets', { token: reservationModel.token }));
                            } catch (error) {
                                await reservationModel.save();
                                const message = this.req.__('Message.SelectedSeatsUnavailable');
                                this.res.redirect(`${this.router.build('customer.reserve.seats', { token: reservationModel.token })}?message=${encodeURIComponent(message)}`);
                            }
                        }
                    } else {
                        this.res.redirect(this.router.build('customer.reserve.seats', { token: reservationModel.token }));
                    }
                });
            } else {
                this.res.render('customer/reserve/seats', {
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
                    this.res.redirect(this.router.build('customer.reserve.profile', { token: reservationModel.token }));
                } catch (error) {
                    this.res.redirect(this.router.build('customer.reserve.tickets', { token: reservationModel.token }));
                }
            } else {
                this.res.render('customer/reserve/tickets', {
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
                    this.res.redirect(this.router.build('customer.reserve.confirm', { token: reservationModel.token }));
                } catch (error) {
                    this.res.render('customer/reserve/profile', {
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
                this.res.locals.email = (email !== undefined) ? email : '';
                this.res.locals.emailConfirm = (email !== undefined) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (email !== undefined) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod = (reservationModel.paymentMethod !== undefined && reservationModel.paymentMethod !== '') ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;

                this.res.render('customer/reserve/profile', {
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

                    await reservationModel.save();
                    this.logger.info('starting GMO payment...');
                    // httpStatusの型定義不足のためanyにキャスト
                    // todo 一時的対処なので解決する
                    this.res.redirect((<any>httpStatus).PERMANENT_REDIRECT, this.router.build('gmo.reserve.start', { token: reservationModel.token }) + `?locale=${this.req.getLocale()}`);
                } catch (error) {
                    await reservationModel.remove();
                    this.next(error);
                }
            } else {
                this.res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 仮予約完了
     */
    public async waitingSettlement(): Promise<void> {
        try {
            const paymentNo = this.req.params.paymentNo;
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    purchaser_group: this.purchaserGroup,
                    status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
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

            this.res.render('customer/reserve/waitingSettlement', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約完了
     */
    public async complete(): Promise<void> {
        try {
            const paymentNo = this.req.params.paymentNo;
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    purchaser_group: this.purchaserGroup,
                    status: ReservationUtil.STATUS_RESERVED,
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

            this.res.render('customer/reserve/complete', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
