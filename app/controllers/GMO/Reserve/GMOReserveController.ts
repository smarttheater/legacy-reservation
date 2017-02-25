import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as moment from 'moment';
import * as querystring from 'querystring';
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
    public start(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || !reservationModel) return this.next(new Error(this.req.__('Message.Expired')));

            // 予約情報セッション削除
            reservationModel.remove(() => {
                // 予約プロセス固有のログファイルをセット
                this.setProcessLogger(reservationModel.paymentNo, () => {
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
                            letter.match(/[Ａ-Ｚａ-ｚ０-９]/) // 全角英数字
                            || letter.match(/[\u3040-\u309F]/) // ひらがな
                            || letter.match(/[\u30A0-\u30FF]/) // カタカナ
                            || letter.match(/[一-龠]/) // 漢字
                        ) {
                            registerDisp1 += letter;
                        }
                    }

                    // tslint:disable-next-line:no-magic-numbers
                    this.res.locals.registerDisp1 = (<any>registerDisp1).mbSubstr(0, 32);
                    // tslint:disable-next-line:no-magic-numbers
                    this.res.locals.registerDisp2 = Util.toFullWidth(`${reservationModel.performance.day.substr(0, 4)}／${reservationModel.performance.day.substr(4, 2)}／${reservationModel.performance.day.substr(6)}`);
                    this.res.locals.registerDisp3 = Util.toFullWidth(reservationModel.performance.theater.name.ja);
                    // tslint:disable-next-line:no-magic-numbers
                    this.res.locals.registerDisp4 = Util.toFullWidth(`開場${reservationModel.performance.open_time.substr(0, 2)}:${reservationModel.performance.open_time.substr(2)}　開演${reservationModel.performance.start_time.substr(0, 2)}:${reservationModel.performance.start_time.substr(2)}`);

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

                    const host = (<any>this.req.headers).host;
                    const protocol = (/^localhost/.test(host)) ? 'http' : 'https';
                    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
                        this.res.locals.retURL = `${protocol}://${conf.get<string>('dns_name_for_gmo_result')}${this.router.build('gmo.reserve.result')}?locale=${this.req.getLocale()}`;
                        // 決済キャンセル時に遷移する加盟店URL
                        this.res.locals.cancelURL = `${protocol}://${conf.get<string>('dns_name_for_gmo_result')}${this.router.build('gmo.reserve.cancel', { paymentNo: reservationModel.paymentNo })}?locale=${this.req.getLocale()}`;
                    } else {
                        this.res.locals.retURL = `${protocol}://${host}${this.router.build('gmo.reserve.result')}?locale=${this.req.getLocale()}`;
                        this.res.locals.cancelURL = `${protocol}://${host}${this.router.build('gmo.reserve.cancel', { paymentNo: reservationModel.paymentNo })}?locale=${this.req.getLocale()}`;
                    }

                    this.logger.info('redirecting to GMO payment...');
                    // GMOへの送信データをログに残すために、一度htmlを取得してからrender
                    this.res.render('gmo/reserve/start', undefined, (renderErr, html) => {
                        if (renderErr) return this.next(renderErr);

                        this.logger.info('rendering gmo/reserve/start...html:', html);
                        this.res.render('gmo/reserve/start');
                    });
                });
            });
        });
    }

    /**
     * GMOからの結果受信
     * GMOで何かしらエラーが発生して「決済をやめる」ボタンから遷移してくることもある
     */
    public result(): void {
        const gmoResultModel = GMOResultModel.parse(this.req.body);
        const paymentNo = gmoResultModel.OrderID;

        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('gmoResultModel is', gmoResultModel);

            // エラー結果の場合
            if (gmoResultModel.ErrCode) {
                // 空席に戻す
                this.logger.info('finding reservations...payment_no:', paymentNo);
                Models.Reservation.find(
                    {
                        payment_no: paymentNo
                    },
                    'gmo_shop_pass_string purchased_at',
                    (err, reservations) => {
                        this.logger.info('reservations found.', err, reservations.length);
                        if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                        // 特に何もしない
                        this.res.render('gmo/reserve/cancel');
                    }
                );
            } else {
                // 決済方法によって振り分け
                switch (gmoResultModel.PayType) {
                    case GMOUtil.PAY_TYPE_CREDIT:
                        this.logger.info('starting GMOReserveCreditController.result...');
                        const creditController = new GMOReserveCreditController(this.req, this.res, this.next);
                        creditController.logger = this.logger;
                        creditController.result(gmoResultModel);
                        break;

                    case GMOUtil.PAY_TYPE_CVS:
                        this.logger.info('starting GMOReserveCsvController.result...');
                        const cvsController = new GMOReserveCvsController(this.req, this.res, this.next);
                        cvsController.logger = this.logger;
                        cvsController.result(gmoResultModel);
                        break;

                    default:
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                        break;
                }
            }
        });
    }

    /**
     * 決済キャンセル時に遷移
     */
    public cancel(): void {
        const paymentNo = this.req.params.paymentNo;
        if (!ReservationUtil.isValidPaymentNo(paymentNo)) return this.next(new Error(this.req.__('Message.Invalid')));

        this.setProcessLogger(paymentNo, () => {
            this.logger.info('start process GMOReserveController.cancel.');

            this.logger.info('finding reservations...');
            Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_WAITING_SETTLEMENT // GMO決済離脱組の処理なので、必ず決済中ステータスになっている
                },
                'purchaser_group'
            ).exec((err, reservations) => {
                this.logger.info('reservations found.', err, reservations);
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                // 特に何もしない
                this.res.render('gmo/reserve/cancel');
            });
        });
    }
}
