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
const chevre_domain_3 = require("@motionpicture/chevre-domain");
const conf = require("config");
const crypto = require("crypto");
const ReserveBaseController_1 = require("../../../ReserveBaseController");
/**
 * GMOコンビニ決済コントローラー
 *
 * @export
 * @class GMOReserveCvsController
 * @extends {ReserveBaseController}
 */
class GMOReserveCvsController extends ReserveBaseController_1.default {
    /**
     * GMOからの結果受信
     */
    result(gmoResultModel) {
        return __awaiter(this, void 0, void 0, function* () {
            // 内容の整合性チェック
            let reservations = [];
            try {
                this.logger.info('finding reservations...payment_no:', gmoResultModel.OrderID);
                reservations = yield chevre_domain_1.Models.Reservation.find({
                    payment_no: gmoResultModel.OrderID
                }, '_id purchaser_group pre_customer').exec();
                this.logger.info('reservations found.', reservations.length);
                if (reservations.length === 0) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
                // チェック文字列
                // 8 ＋ 23 ＋ 24 ＋ 25 ＋ 39 + 14 ＋ショップパスワード
                const md5hash = crypto.createHash('md5');
                md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.CvsCode}${gmoResultModel.CvsConfNo}${gmoResultModel.CvsReceiptNo}${gmoResultModel.PaymentTerm}${gmoResultModel.TranDate}${conf.get('gmo_payment_shop_password')}`, 'utf8');
                const checkString = md5hash.digest('hex');
                this.logger.info('CheckString must be ', checkString);
                if (checkString !== gmoResultModel.CheckString) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            try {
                // 決済待ちステータスへ変更
                this.logger.info('updating reservations by paymentNo...', gmoResultModel.OrderID);
                const raw = yield chevre_domain_1.Models.Reservation.update({ payment_no: gmoResultModel.OrderID }, {
                    gmo_shop_id: gmoResultModel.ShopID,
                    gmo_amount: gmoResultModel.Amount,
                    gmo_tax: gmoResultModel.Tax,
                    gmo_cvs_code: gmoResultModel.CvsCode,
                    gmo_cvs_conf_no: gmoResultModel.CvsConfNo,
                    gmo_cvs_receipt_no: gmoResultModel.CvsReceiptNo,
                    gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl,
                    gmo_payment_term: gmoResultModel.PaymentTerm,
                    updated_user: 'GMOReserveCsvController'
                }, { multi: true }).exec();
                this.logger.info('reservations updated.', raw);
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
                return;
            }
            // 仮予約完了メールキュー追加(あれば更新日時を更新するだけ)
            try {
                this.logger.info('creating reservationEmailCue...');
                const cue = yield chevre_domain_1.Models.ReservationEmailCue.findOneAndUpdate({
                    payment_no: gmoResultModel.OrderID,
                    template: chevre_domain_3.ReservationEmailCueUtil.TEMPLATE_TEMPORARY
                }, {
                    $set: { updated_at: Date.now() },
                    $setOnInsert: { status: chevre_domain_3.ReservationEmailCueUtil.STATUS_UNSENT }
                }, {
                    upsert: true,
                    new: true
                }).exec();
                this.logger.info('reservationEmailCue created.', cue);
            }
            catch (error) {
                // 失敗してもスルー(ログと運用でなんとかする)
            }
            this.logger.info('redirecting to waitingSettlement...');
            // 購入者区分による振り分け
            const group = reservations[0].get('purchaser_group');
            switch (group) {
                case chevre_domain_2.ReservationUtil.PURCHASER_GROUP_MEMBER:
                    this.res.redirect(this.router.build('member.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
                    break;
                default:
                    if (reservations[0].get('pre_customer') !== undefined && reservations[0].get('pre_customer') !== null) {
                        this.res.redirect(this.router.build('pre.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
                    }
                    else {
                        this.res.redirect(this.router.build('customer.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
                    }
                    break;
            }
        });
    }
}
exports.default = GMOReserveCvsController;
