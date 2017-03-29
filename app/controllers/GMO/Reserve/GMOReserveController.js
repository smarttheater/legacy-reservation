"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const conf = require("config");
const moment = require("moment");
const querystring = require("querystring");
const _ = require("underscore");
const util = require("util");
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
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                const reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                // 予約情報セッション削除
                yield reservationModel.remove();
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
                    if (/[Ａ-Ｚａ-ｚ０-９]/.test(letter) ||
                        /[\u3040-\u309F]/.test(letter) ||
                        /[\u30A0-\u30FF]/.test(letter) ||
                        /[一-龠]/.test(letter) // 漢字
                    ) {
                        registerDisp1 += letter;
                    }
                }
                // tslint:disable-next-line:no-magic-numbers
                this.res.locals.registerDisp1 = registerDisp1.mbSubstr(0, 32);
                this.res.locals.registerDisp2 = Util.toFullWidth(util.format('%s／%s／%s', reservationModel.performance.day.substr(0, 4), // tslint:disable-line:no-magic-numbers
                reservationModel.performance.day.substr(4, 2), // tslint:disable-line:no-magic-numbers
                reservationModel.performance.day.substr(6) // tslint:disable-line:no-magic-numbers
                ));
                this.res.locals.registerDisp3 = Util.toFullWidth(reservationModel.performance.theater.name.ja);
                this.res.locals.registerDisp4 = Util.toFullWidth(util.format('開場%s:%s　開演%s:%s', reservationModel.performance.open_time.substr(0, 2), // tslint:disable-line:no-magic-numbers
                reservationModel.performance.open_time.substr(2), // tslint:disable-line:no-magic-numbers
                reservationModel.performance.start_time.substr(0, 2), // tslint:disable-line:no-magic-numbers
                reservationModel.performance.start_time.substr(2) // tslint:disable-line:no-magic-numbers
                ));
                this.res.locals.shopId = conf.get('gmo_payment_shop_id');
                this.res.locals.orderID = reservationModel.paymentNo; // 27桁まで(購入番号を使用)
                this.res.locals.amount = reservationModel.getTotalCharge().toString();
                this.res.locals.dateTime = moment(reservationModel.purchasedAt).format('YYYYMMDDHHmmss');
                this.res.locals.useCredit = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CREDIT) ? '1' : '0';
                this.res.locals.useCvs = (reservationModel.paymentMethod === GMOUtil.PAY_TYPE_CVS) ? '1' : '0';
                this.res.locals.shopPassString = GMOUtil.createShopPassString(conf.get('gmo_payment_shop_id'), this.res.locals.orderID, this.res.locals.amount, conf.get('gmo_payment_shop_password'), this.res.locals.dateTime);
                this.res.locals.retURL = util.format('%s%s?locale=%s', process.env.FRONTEND_GMO_RESULT_ENDPOINT, this.router.build('gmo.reserve.result'), this.req.getLocale());
                // 決済キャンセル時に遷移する加盟店URL
                this.res.locals.cancelURL = util.format('%s%s?locale=%s', process.env.FRONTEND_GMO_RESULT_ENDPOINT, this.router.build('gmo.reserve.cancel', { paymentNo: reservationModel.paymentNo }), this.req.getLocale());
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
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * GMOからの結果受信
     * GMOで何かしらエラーが発生して「決済をやめる」ボタンから遷移してくることもある
     */
    result() {
        return __awaiter(this, void 0, void 0, function* () {
            const gmoResultModel = GMOResultModel_1.default.parse(this.req.body);
            const paymentNo = gmoResultModel.OrderID;
            // 予約プロセス固有のログファイルをセット
            this.setProcessLogger(paymentNo);
            this.logger.info('gmoResultModel is', gmoResultModel);
            // エラー結果の場合
            if (!_.isEmpty(gmoResultModel.ErrCode)) {
                // 空席に戻す
                try {
                    this.logger.info('finding reservations...payment_no:', paymentNo);
                    const reservations = yield chevre_domain_1.Models.Reservation.find({
                        payment_no: paymentNo
                    }, 'gmo_shop_pass_string purchased_at').exec();
                    this.logger.info('reservations found.', reservations.length);
                    if (reservations.length === 0) {
                        this.next(new Error(this.req.__('Message.NotFound')));
                        return;
                    }
                    // 特に何もしない
                    this.res.render('gmo/reserve/cancel');
                }
                catch (error) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                }
            }
            else {
                // 決済方法によって振り分け
                switch (gmoResultModel.PayType) {
                    case GMOUtil.PAY_TYPE_CREDIT:
                        this.logger.info('starting GMOReserveCreditController.result...');
                        const creditController = new GMOReserveCreditController_1.default(this.req, this.res, this.next);
                        creditController.logger = this.logger;
                        yield creditController.result(gmoResultModel);
                        break;
                    case GMOUtil.PAY_TYPE_CVS:
                        this.logger.info('starting GMOReserveCsvController.result...');
                        const cvsController = new GMOReserveCvsController_1.default(this.req, this.res, this.next);
                        cvsController.logger = this.logger;
                        yield cvsController.result(gmoResultModel);
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
        return __awaiter(this, void 0, void 0, function* () {
            const paymentNo = this.req.params.paymentNo;
            if (!chevre_domain_2.ReservationUtil.isValidPaymentNo(paymentNo)) {
                this.next(new Error(this.req.__('Message.Invalid')));
                return;
            }
            this.setProcessLogger(paymentNo);
            this.logger.info('start process GMOReserveController.cancel.');
            this.logger.info('finding reservations...');
            try {
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    payment_no: paymentNo,
                    status: chevre_domain_2.ReservationUtil.STATUS_WAITING_SETTLEMENT // GMO決済離脱組の処理なので、必ず決済中ステータスになっている
                }, 'purchaser_group').exec();
                this.logger.info('reservations found.', reservations);
                if (reservations.length === 0) {
                    this.next(new Error(this.req.__('Message.NotFound')));
                    return;
                }
                // 特に何もしない
                this.res.render('gmo/reserve/cancel');
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
}
exports.default = GMOReserveController;
