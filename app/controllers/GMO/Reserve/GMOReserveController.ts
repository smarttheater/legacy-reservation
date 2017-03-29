import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as moment from 'moment';
import * as querystring from 'querystring';
import * as _ from 'underscore';
import * as util from 'util';

import * as GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import * as Util from '../../../../common/Util/Util';
import GMOResultModel from '../../../models/Reserve/GMOResultModel';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReserveBaseController from '../../ReserveBaseController';
import GMOReserveCreditController from './Credit/GMOReserveCreditController';
import GMOReserveCvsController from './Cvs/GMOReserveCvsController';

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
        if (i + start > textLength - 1) break;

        // マルチバイト文字列かどうか
        const letter = letters[i + start];
        // tslint:disable-next-line:no-magic-numbers
        count += (querystring.escape(letter).length < 4) ? 1 : 2;

        if (count > length) break;

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
            // 予約プロセス固有のログファイルをセット
            this.setProcessLogger(reservationModel.paymentNo);

            // GMOへ遷移画面

            // 作品名から、特定文字以外を取り除く
            const filmNameFullWidth = Util.toFullWidth(reservationModel.performance.film.name.ja);
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

            this.res.locals.registerDisp2 = Util.toFullWidth(
                util.format(
                    '%s／%s／%s',
                    reservationModel.performance.day.substr(0, 4), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.day.substr(4, 2), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.day.substr(6) // tslint:disable-line:no-magic-numbers
                )
            );
            this.res.locals.registerDisp3 = Util.toFullWidth(reservationModel.performance.theater.name.ja);
            this.res.locals.registerDisp4 = Util.toFullWidth(
                util.format(
                    '開場%s:%s　開演%s:%s',
                    reservationModel.performance.open_time.substr(0, 2), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.open_time.substr(2), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.start_time.substr(0, 2), // tslint:disable-line:no-magic-numbers
                    reservationModel.performance.start_time.substr(2) // tslint:disable-line:no-magic-numbers
                )
            );

            this.res.locals.shopId = conf.get<string>('gmo_payment_shop_id');
            this.res.locals.orderID = reservationModel.paymentNo; // 27桁まで(購入番号を使用)
            this.res.locals.amount = reservationModel.getTotalCharge().toString();
            this.res.locals.dateTime = moment(reservationModel.purchasedAt).format('YYYYMMDDHHmmss');
            this.res.locals.useCredit = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CREDIT) ? '1' : '0';
            this.res.locals.useCvs = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CVS) ? '1' : '0';
            this.res.locals.shopPassString = GMOUtil.createShopPassString(
                conf.get<string>('gmo_payment_shop_id'),
                this.res.locals.orderID,
                this.res.locals.amount,
                conf.get<string>('gmo_payment_shop_password'),
                this.res.locals.dateTime
            );

            this.res.locals.retURL = util.format(
                '%s%s?locale=%s',
                process.env.FRONTEND_GMO_RESULT_ENDPOINT,
                this.router.build('gmo.reserve.result'),
                this.req.getLocale()
            );
            // 決済キャンセル時に遷移する加盟店URL
            this.res.locals.cancelURL = util.format(
                '%s%s?locale=%s',
                process.env.FRONTEND_GMO_RESULT_ENDPOINT,
                this.router.build('gmo.reserve.cancel', { paymentNo: reservationModel.paymentNo }),
                this.req.getLocale()
            );

            this.logger.info('redirecting to GMO payment...');
            // GMOへの送信データをログに残すために、一度htmlを取得してからrender
            this.res.render('gmo/reserve/start', undefined, (renderErr, html) => {
                if (renderErr instanceof Error) {
                    this.next(renderErr);
                    return;
                }

                this.logger.info('rendering gmo/reserve/start...html:', html);
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

        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymentNo);
        this.logger.info('gmoResultModel is', gmoResultModel);

        // エラー結果の場合
        if (!_.isEmpty(gmoResultModel.ErrCode)) {
            // 空席に戻す
            try {
                this.logger.info('finding reservations...payment_no:', paymentNo);
                const reservations = await Models.Reservation.find(
                    {
                        payment_no: paymentNo
                    },
                    'gmo_shop_pass_string purchased_at'
                ).exec();
                this.logger.info('reservations found.', reservations.length);

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
                case GMOUtil.PAY_TYPE_CREDIT:
                    this.logger.info('starting GMOReserveCreditController.result...');
                    const creditController = new GMOReserveCreditController(this.req, this.res, this.next);
                    creditController.logger = this.logger;
                    await creditController.result(gmoResultModel);
                    break;

                case GMOUtil.PAY_TYPE_CVS:
                    this.logger.info('starting GMOReserveCsvController.result...');
                    const cvsController = new GMOReserveCvsController(this.req, this.res, this.next);
                    cvsController.logger = this.logger;
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

        this.setProcessLogger(paymentNo);
        this.logger.info('start process GMOReserveController.cancel.');

        this.logger.info('finding reservations...');
        try {
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_WAITING_SETTLEMENT // GMO決済離脱組の処理なので、必ず決済中ステータスになっている
                },
                'purchaser_group'
            ).exec();
            this.logger.info('reservations found.', reservations);

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
