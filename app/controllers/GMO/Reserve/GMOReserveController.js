"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const conf = require("config");
const moment = require("moment");
const querystring = require("querystring");
const GMOUtil = require("../../../../common/Util/GMO/GMOUtil");
const Util = require("../../../../common/Util/Util");
const GMOResultModel_1 = require("../../../models/Reserve/GMOResultModel");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
const GMOReserveCreditController_1 = require("./Credit/GMOReserveCreditController");
const GMOReserveCvsController_1 = require("./Cvs/GMOReserveCvsController");
/**
 * マルチバイト文字列対応String.substr
 *
 * @params {number} start
 * @params {number} length
 */
// tslint:disable-next-line:space-before-function-paren
String.prototype.mbSubstr = function (start, length) {
    // tslint:disable-next-line:no-invalid-this
    const letters = this.split('');
    const textLength = letters.length;
    let count = 0;
    let result = '';
    // todo 文字列のループはこの書き方は本来よろしくないので、暇があったら直す
    // tslint:disable-next-line:no-increment-decrement
    for (let i = 0; i < textLength; i++) {
        if (i + start > textLength - 1)
            break;
        // マルチバイト文字列かどうか
        const letter = letters[i + start];
        // tslint:disable-next-line:no-magic-numbers
        count += (querystring.escape(letter).length < 4) ? 1 : 2;
        if (count > length)
            break;
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
class GMOReserveController extends ReserveBaseController_1.default {
    /**
     * GMO決済を開始する
     */
    start() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
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
                        if (letter.match(/[Ａ-Ｚａ-ｚ０-９]/) // 全角英数字
                            || letter.match(/[\u3040-\u309F]/) // ひらがな
                            || letter.match(/[\u30A0-\u30FF]/) // カタカナ
                            || letter.match(/[一-龠]/) // 漢字
                        ) {
                            registerDisp1 += letter;
                        }
                    }
                    // tslint:disable-next-line:no-magic-numbers
                    this.res.locals.registerDisp1 = registerDisp1.mbSubstr(0, 32);
                    // tslint:disable-next-line:no-magic-numbers
                    this.res.locals.registerDisp2 = Util.toFullWidth(`${reservationModel.performance.day.substr(0, 4)}／${reservationModel.performance.day.substr(4, 2)}／${reservationModel.performance.day.substr(6)}`);
                    this.res.locals.registerDisp3 = Util.toFullWidth(reservationModel.performance.theater.name.ja);
                    // tslint:disable-next-line:no-magic-numbers
                    this.res.locals.registerDisp4 = Util.toFullWidth(`開場${reservationModel.performance.open_time.substr(0, 2)}:${reservationModel.performance.open_time.substr(2)}　開演${reservationModel.performance.start_time.substr(0, 2)}:${reservationModel.performance.start_time.substr(2)}`);
                    this.res.locals.shopId = conf.get('gmo_payment_shop_id');
                    this.res.locals.orderID = reservationModel.paymentNo; // 27桁まで(購入番号を使用)
                    this.res.locals.amount = reservationModel.getTotalCharge().toString();
                    this.res.locals.dateTime = moment(reservationModel.purchasedAt).format('YYYYMMDDHHmmss');
                    this.res.locals.useCredit = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CREDIT) ? '1' : '0';
                    this.res.locals.useCvs = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CVS) ? '1' : '0';
                    this.res.locals.shopPassString = GMOUtil.createShopPassString(conf.get('gmo_payment_shop_id'), this.res.locals.orderID, this.res.locals.amount, conf.get('gmo_payment_shop_password'), this.res.locals.dateTime);
                    this.res.locals.retURL = `${process.env.FRONTEND_GMO_RESULT_ENDPOINT}${this.router.build('gmo.reserve.result')}?locale=${this.req.getLocale()}`;
                    // 決済キャンセル時に遷移する加盟店URL
                    this.res.locals.cancelURL = `${process.env.FRONTEND_GMO_RESULT_ENDPOINT}${this.router.build('gmo.reserve.cancel', { paymentNo: reservationModel.paymentNo })}?locale=${this.req.getLocale()}`;
                    this.logger.info('redirecting to GMO payment...');
                    // GMOへの送信データをログに残すために、一度htmlを取得してからrender
                    this.res.render('gmo/reserve/start', undefined, (renderErr, html) => {
                        if (renderErr)
                            return this.next(renderErr);
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
    result() {
        const gmoResultModel = GMOResultModel_1.default.parse(this.req.body);
        const paymentNo = gmoResultModel.OrderID;
        // 予約プロセス固有のログファイルをセット
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('gmoResultModel is', gmoResultModel);
            // エラー結果の場合
            if (gmoResultModel.ErrCode) {
                // 空席に戻す
                this.logger.info('finding reservations...payment_no:', paymentNo);
                chevre_domain_1.Models.Reservation.find({
                    payment_no: paymentNo
                }, 'gmo_shop_pass_string purchased_at', (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations.length);
                    if (err)
                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                    if (reservations.length === 0)
                        return this.next(new Error(this.req.__('Message.NotFound')));
                    // 特に何もしない
                    this.res.render('gmo/reserve/cancel');
                });
            }
            else {
                // 決済方法によって振り分け
                switch (gmoResultModel.PayType) {
                    case GMOUtil.PAY_TYPE_CREDIT:
                        this.logger.info('starting GMOReserveCreditController.result...');
                        const creditController = new GMOReserveCreditController_1.default(this.req, this.res, this.next);
                        creditController.logger = this.logger;
                        creditController.result(gmoResultModel);
                        break;
                    case GMOUtil.PAY_TYPE_CVS:
                        this.logger.info('starting GMOReserveCsvController.result...');
                        const cvsController = new GMOReserveCvsController_1.default(this.req, this.res, this.next);
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
    cancel() {
        const paymentNo = this.req.params.paymentNo;
        if (!chevre_domain_2.ReservationUtil.isValidPaymentNo(paymentNo))
            return this.next(new Error(this.req.__('Message.Invalid')));
        this.setProcessLogger(paymentNo, () => {
            this.logger.info('start process GMOReserveController.cancel.');
            this.logger.info('finding reservations...');
            chevre_domain_1.Models.Reservation.find({
                payment_no: paymentNo,
                status: chevre_domain_2.ReservationUtil.STATUS_WAITING_SETTLEMENT // GMO決済離脱組の処理なので、必ず決済中ステータスになっている
            }, 'purchaser_group').exec((err, reservations) => {
                this.logger.info('reservations found.', err, reservations);
                if (err)
                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0)
                    return this.next(new Error(this.req.__('Message.NotFound')));
                // 特に何もしない
                this.res.render('gmo/reserve/cancel');
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveController;
