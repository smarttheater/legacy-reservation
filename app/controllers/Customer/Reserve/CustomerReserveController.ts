import { Models } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';
import { FilmUtil } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import { Util as GMOUtil } from '@motionpicture/gmo-service';
import * as conf from 'config';
import * as createDebug from 'debug';
import * as httpStatus from 'http-status';
import * as moment from 'moment';
import * as _ from 'underscore';

import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/reserve/session';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

const debug = createDebug('chevre-frontend:controller:customerReserve');

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
     * @method performances
     * @returns {Promise<void>}
     */
    public async performances(): Promise<void> {
        if (this.req.method === 'POST') {
            reservePerformanceForm(this.req);
            const validationResult = await this.req.getValidationResult();
            if (!validationResult.isEmpty()) {
                this.res.render('customer/reserve/performances');
                return;
            }
            const performaceId = this.req.body.performanceId;
            this.res.redirect(`/customer/reserve/start?performance=${performaceId}&locale=${this.req.getLocale()}`);
            return;
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
                if (!_.isEmpty(this.req.query.locale)) {
                    this.req.setLocale(this.req.query.locale);
                }

                this.next(new Error(this.req.__('Message.OutOfTerm')));
                return;
            }

            // 2次販売10分前より閉める
            if (moment() < moment(conf.get<string>('datetimes.reservation_start_customers_second')) &&
                // tslint:disable-next-line:no-magic-numbers
                moment() > moment(conf.get<string>('datetimes.reservation_start_customers_second')).add(-15, 'minutes')
            ) {
                if (!_.isEmpty(this.req.query.locale)) {
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
                this.res.redirect(`/customer/reserve/${reservationModel.token}/terms`);
            } else {
                // 今回は必ずパフォーマンス指定で遷移してくるはず
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                // reservationModel.save(() => {
                //     this.res.redirect('/customer/reserve/performances');
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
                this.res.redirect(`/customer/reserve/${token}/seats`);
            } else {
                this.res.render('customer/reserve/terms');
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 座席選択
     * @method seats
     * @returns {Promise<void>}
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
                    this.res.redirect(`/customer/reserve/${token}/seats`);
                    return;
                }
                reservationModel = <ReservationModel>reservationModel;
                const seatCodes: string[] = JSON.parse(this.req.body.seatCodes);

                // 追加指定席を合わせて制限枚数を超過した場合
                if (seatCodes.length > limit) {
                    const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                    this.res.redirect(`/customer/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
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
                        this.res.redirect(`/customer/reserve/${token}/tickets`);
                        return;
                    } catch (error) {
                        await reservationModel.save();
                        const message = this.req.__('Message.SelectedSeatsUnavailable');
                        let url = `/customer/reserve/${token}/seats`;
                        url += '?message=' + encodeURIComponent(message);
                        this.res.redirect(url);
                        return;
                    }
                }
            } else {
                this.res.render('customer/reserve/seats', {
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
                    this.res.redirect(`/customer/reserve/${token}/profile`);
                } catch (error) {
                    this.res.redirect(`/customer/reserve/${token}/tickets`);
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

                    // クレジットカード決済のオーソリ、あるいは、オーダーID発行
                    await this.processFixGMO(reservationModel);

                    // 予約情報確定
                    await this.processAllExceptConfirm(reservationModel);

                    await reservationModel.save();
                    this.res.redirect(`/customer/reserve/${token}/confirm`);
                } catch (error) {
                    console.error(error);
                    this.res.render('customer/reserve/profile', {
                        reservationModel: reservationModel,
                        GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                        GMO_SHOP_ID: process.env.GMO_SHOP_ID
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
                this.res.locals.paymentMethod =
                    (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;

                this.res.render('customer/reserve/profile', {
                    reservationModel: reservationModel,
                    GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                    GMO_SHOP_ID: process.env.GMO_SHOP_ID
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

                    if (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CREDIT) {
                        await this.processFixReservations(reservationModel.performance.day, reservationModel.paymentNo, {});
                        debug('processFixReservations processed.');
                        await reservationModel.remove();
                        this.res.redirect(`/customer/reserve/${reservationModel.performance.day}/${reservationModel.paymentNo}/complete`);
                    } else {
                        // todo リンク決済に備えて、ステータスを期限を更新する

                        // httpStatusの型定義不足のためanyにキャスト
                        // todo 一時的対処なので解決する
                        await reservationModel.save();
                        this.res.redirect(
                            (<any>httpStatus).PERMANENT_REDIRECT,
                            `/GMO/reserve/${token}/start?locale=${this.req.getLocale()}`
                        );
                    }
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
            const reservations = await Models.Reservation.find(
                {
                    performance_day: this.req.params.performanceDay,
                    payment_no: this.req.params.paymentNo,
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
            const reservations = await Models.Reservation.find(
                {
                    performance_day: this.req.params.performanceDay,
                    payment_no: this.req.params.paymentNo,
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
