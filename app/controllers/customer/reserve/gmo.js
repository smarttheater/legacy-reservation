"use strict";
/**
 * GMO関連予約コントローラー
 * 座席予約フローのうちGMOと連携するアクションを実装しています。
 * @namespace controller/customer/reserve/gmo
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const createDebug = require("debug");
const moment = require("moment");
const querystring = require("querystring");
const util = require("util");
const session_1 = require("../../../models/reserve/session");
const debug = createDebug('ttts-frontend:controller:gmoReserve');
const SHOP_ID = process.env.GMO_SHOP_ID;
const SHOP_PASS = process.env.GMO_SHOP_PASS;
if (SHOP_ID === undefined || SHOP_PASS === undefined) {
    throw new Error('Environment variables GMO_SHOP_ID, GMO_SHOP_PASS are required for connecting to GMO. Please set them.');
}
/**
 * マルチバイト文字列対応String.substr
 *
 * @params {number} start
 * @params {number} length
 */
String.prototype.mbSubstr = function (startPosition, length) {
    // tslint:disable-next-line:no-invalid-this
    const letters = this.split('');
    const textLength = letters.length;
    let count = 0;
    let slicedString = '';
    // todo 文字列のループはこの書き方は本来よろしくないので、暇があったら直す
    // tslint:disable-next-line:no-increment-decrement
    for (let i = 0; i < textLength; i++) {
        if (i + startPosition > textLength - 1) {
            break;
        }
        // マルチバイト文字列かどうか
        const letter = letters[i + startPosition];
        // tslint:disable-next-line:no-magic-numbers
        count += (querystring.escape(letter).length < 4) ? 1 : 2;
        if (count > length) {
            break;
        }
        slicedString += letter;
    }
    return slicedString;
};
/**
 * GMO決済を開始する
 */
function start(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Message.Expired')));
                return;
            }
            // 予約情報セッション削除
            session_1.default.REMOVE(req);
            // GMOへ遷移画面
            // 作品名から、特定文字以外を取り除く
            const filmNameFullWidth = ttts.CommonUtil.toFullWidth(reservationModel.performance.film.name.ja);
            const filmNameFullWidthLength = filmNameFullWidth.length;
            let registerDisp1 = '';
            // todo 文字列のループはこの書き方は本来よろしくないので、暇があったら直す
            // tslint:disable-next-line:no-increment-decrement
            for (let i = 0; i < filmNameFullWidthLength; i++) {
                const letter = filmNameFullWidth[i];
                if (/[Ａ-Ｚａ-ｚ０-９]/.test(letter) || // 全角英数字
                    /[\u3040-\u309F]/.test(letter) || // ひらがな
                    /[\u30A0-\u30FF]/.test(letter) || // カタカナ
                    /[一-龠]/.test(letter) // 漢字
                ) {
                    registerDisp1 += letter;
                }
            }
            // tslint:disable-next-line:no-magic-numbers
            res.locals.registerDisp1 = registerDisp1.mbSubstr(0, 32);
            res.locals.registerDisp2 = ttts.CommonUtil.toFullWidth(util.format('%s／%s／%s', reservationModel.performance.day.substr(0, 4), // tslint:disable-line:no-magic-numbers
            reservationModel.performance.day.substr(4, 2), // tslint:disable-line:no-magic-numbers
            reservationModel.performance.day.substr(6) // tslint:disable-line:no-magic-numbers
            ));
            res.locals.registerDisp3 = ttts.CommonUtil.toFullWidth(reservationModel.performance.theater.name.ja);
            res.locals.registerDisp4 = ttts.CommonUtil.toFullWidth(util.format('開場%s:%s　開演%s:%s', reservationModel.performance.open_time.substr(0, 2), // tslint:disable-line:no-magic-numbers
            reservationModel.performance.open_time.substr(2), // tslint:disable-line:no-magic-numbers
            reservationModel.performance.start_time.substr(0, 2), // tslint:disable-line:no-magic-numbers
            reservationModel.performance.start_time.substr(2) // tslint:disable-line:no-magic-numbers
            ));
            res.locals.shopId = process.env.GMO_SHOP_ID;
            res.locals.orderID = reservationModel.transactionGMO.orderId;
            res.locals.reserveNo = reservationModel.paymentNo;
            res.locals.amount = reservationModel.getTotalCharge().toString();
            res.locals.dateTime = moment(reservationModel.purchasedAt).format('YYYYMMDDHHmmss');
            res.locals.useCredit = (reservationModel.paymentMethod === ttts.factory.paymentMethodType.CreditCard) ? '1' : '0';
            res.locals.useCvs = (reservationModel.paymentMethod === ttts.factory.paymentMethodType.Cvs) ? '1' : '0';
            res.locals.shopPassString = ttts.GMO.utils.util.createShopPassString({
                shopId: SHOP_ID,
                shopPass: SHOP_PASS,
                orderId: res.locals.orderID,
                amount: reservationModel.getTotalCharge(),
                dateTime: res.locals.dateTime
            });
            res.locals.retURL = util.format('%s%s?locale=%s', process.env.FRONTEND_GMO_RESULT_ENDPOINT, '/customer/reserve/gmo/result', req.getLocale());
            // 決済キャンセル時に遷移する加盟店URL
            res.locals.cancelURL = util.format('%s%s?locale=%s', process.env.FRONTEND_GMO_RESULT_ENDPOINT, `/customer/reserve/gmo/${res.locals.orderID}/cancel`, req.getLocale());
            debug('redirecting to GMO payment...');
            // GMOへの送信データをログに残すために、一度htmlを取得してからrender
            res.render('customer/reserve/gmo/start');
        }
        catch (error) {
            next(new Error(req.__('Message.UnexpectedError')));
        }
    });
}
exports.start = start;
