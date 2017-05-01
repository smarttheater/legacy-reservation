import { CommonUtil, Models, ReservationUtil } from '@motionpicture/chevre-domain';
import { Util as GMOUtil } from '@motionpicture/gmo-service';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as querystring from 'querystring';
import * as _ from 'underscore';
import * as util from 'util';

import GMOResultModel from '../../../models/gmo/result';
import ReservationModel from '../../../models/reserve/session';
import ReserveBaseController from '../../ReserveBaseController';
import GMOReserveCvsController from './Cvs/GMOReserveCvsController';

const debug = createDebug('chevre-frontend:controller:gmoReserve');

/**
 * マルチバイト文字列対応String.substr
 *
 * @params {number} start
 * @params {number} length
 */
// tslint:disable-next-line:space-before-function-paren
(<any>String.prototype).mbSubstr = function (this: any, start: number, length: number) {
    // tslint:disable-next-line:no-invalid-this
    const letters = this.split('');
    const textLength = letters.length;
    let count = 0;
    let result = '';

    // todo 文字列のループはこの書き方は本来よろしくないので、暇があったら直す
    // tslint:disable-next-line:no-increment-decrement
    for (let i = 0; i < textLength; i++) {
        if (i + start > textLength - 1) {
            break;
        }

        // マルチバイト文字列かどうか
        const letter = letters[i + start];
        // tslint:disable-next-line:no-magic-numbers
        count += (querystring.escape(letter).length < 4) ? 1 : 2;

        if (count > length) {
            break;
        }

        result += letter;
    }

    return result;
};

/**
 * GMO関連予約コントローラー
 *
 * 座席予約フローのうちGMOと連携するアクションを実装しています。
 *
 * @export
 * @class GMOReserveController
 * @extends {ReserveBaseController}
 */
export default class GMOReserveController extends ReserveBaseController {
    /**
     * GMO決済を開始する
     */
    public async start() {
        try {
            const token = this.req.params.token;
            const reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            // 予約情報セッション削除
            await reservationModel.remove();

            // GMOへ遷移画面

            // 作品名から、特定文字以外を取り除く
            const filmNameFullWidth = CommonUtil.toFullWidth(reservationModel.performance.film.name.ja);
            const filmNameFullWidthLength = filmNameFullWidth.length;
            let registerDisp1 = '';
            // todo 文字列のループはこの書き方は本来よろしくないので、暇があったら直す
            // tslint:disable-next-line:no-increment-decrement
            for (let i = 0; i < filmNameFullWidthLength; i++) {
                const letter = filmNameFullWidth[i];
                if (
                    /[Ａ-Ｚａ-ｚ０-９]/.test(letter) || // 全角英数字
                    /[\u3040-\u309F]/.test(letter) || // ひらがな
                    /[\u30A0-\u30FF]/.test(letter) || // カタカナ
                    /[一-龠]/.test(letter) // 漢字
                ) {
                    registerDisp1 += letter;
                }
            }

            // tslint:disable-next-line:no-magic-numbers
            this.res.locals.registerDisp1 = (<any>registerDisp1).mbSubstr(0, 32);

            this.res.locals.registerDisp2 = CommonUtil.toFullWidth(
                util.format(
                    '%s／%s／%s',
                    reservationModel.performance.day.substr(0, 4), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.day.substr(4, 2), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.day.substr(6) // tslint:disable-line:no-magic-numbers
                )
            );
            this.res.locals.registerDisp3 = CommonUtil.toFullWidth(reservationModel.performance.theater.name.ja);
            this.res.locals.registerDisp4 = CommonUtil.toFullWidth(
                util.format(
                    '開場%s:%s　開演%s:%s',
                    reservationModel.performance.open_time.substr(0, 2), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.open_time.substr(2), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.start_time.substr(0, 2), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.start_time.substr(2) // tslint:disable-line:no-magic-numbers
                )
            );

            this.res.locals.shopId = process.env.GMO_SHOP_ID;
            this.res.locals.orderID = ReservationUtil.createGMOOrderId(reservationModel.performance.day, reservationModel.paymentNo, '00');
            this.res.locals.amount = reservationModel.getTotalCharge().toString();
            this.res.locals.dateTime = moment(reservationModel.purchasedAt).format('YYYYMMDDHHmmss');
            this.res.locals.useCredit = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CREDIT) ? '1' : '0';
            this.res.locals.useCvs = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CVS) ? '1' : '0';
            this.res.locals.shopPassString = GMOUtil.createShopPassString({
                shopId: process.env.GMO_SHOP_ID,
                shopPass: process.env.GMO_SHOP_PASS,
                orderId: this.res.locals.orderID,
                amount: reservationModel.getTotalCharge(),
                dateTime: this.res.locals.dateTime
            });

            this.res.locals.retURL = util.format(
                '%s%s?locale=%s',
                process.env.FRONTEND_GMO_RESULT_ENDPOINT,
                '/GMO/reserve/result',
                this.req.getLocale()
            );
            // 決済キャンセル時に遷移する加盟店URL
            this.res.locals.cancelURL = util.format(
                '%s%s?locale=%s',
                process.env.FRONTEND_GMO_RESULT_ENDPOINT,
                `/GMO/reserve/${reservationModel.paymentNo}/cancel`,
                this.req.getLocale()
            );

            debug('redirecting to GMO payment...');
            // GMOへの送信データをログに残すために、一度htmlを取得してからrender
            this.res.render('gmo/reserve/start', undefined, (renderErr, html) => {
                if (renderErr instanceof Error) {
                    this.next(renderErr);
                    return;
                }

                debug('rendering gmo/reserve/start...html:', html);
                this.res.render('gmo/reserve/start');
            });

        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * GMOからの結果受信
     * GMOで何かしらエラーが発生して「決済をやめる」ボタンから遷移してくることもある
     */
    public async result(): Promise<void> {
        const gmoResultModel = GMOResultModel.parse(this.req.body);
        const paymentNo = gmoResultModel.OrderID;

        debug('gmoResultModel is', gmoResultModel);

        // エラー結果の場合
        if (!_.isEmpty(gmoResultModel.ErrCode)) {
            // 空席に戻す
            try {
                debug('finding reservations...payment_no:', paymentNo);
                const reservations = await Models.Reservation.find(
                    {
                        payment_no: paymentNo
                    },
                    'purchased_at'
                ).exec();
                debug('reservations found.', reservations.length);

                if (reservations.length === 0) {
                    this.next(new Error(this.req.__('Message.NotFound')));
                    return;
                }

                // 特に何もしない
                this.res.render('gmo/reserve/cancel');
            } catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        } else {
            // 決済方法によって振り分け
            switch (gmoResultModel.PayType) {
                case GMOUtil.PAY_TYPE_CVS:
                    debug('starting GMOReserveCsvController.result...');
                    const cvsController = new GMOReserveCvsController(this.req, this.res, this.next);
                    await cvsController.result(gmoResultModel);
                    break;

                default:
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    break;
            }
        }
    }

    /**
     * 決済キャンセル時に遷移
     */
    public async cancel(): Promise<void> {
        const paymentNo = this.req.params.paymentNo;
        if (!ReservationUtil.isValidPaymentNo(paymentNo)) {
            this.next(new Error(this.req.__('Message.Invalid')));
            return;
        }

        debug('start process GMOReserveController.cancel.');

        debug('finding reservations...');
        try {
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_WAITING_SETTLEMENT // GMO決済離脱組の処理なので、必ず決済中ステータスになっている
                },
                'purchaser_group'
            ).exec();
            debug('reservations found.', reservations);

            if (reservations.length === 0) {
                this.next(new Error(this.req.__('Message.NotFound')));
                return;
            }

            // 特に何もしない
            this.res.render('gmo/reserve/cancel');
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
