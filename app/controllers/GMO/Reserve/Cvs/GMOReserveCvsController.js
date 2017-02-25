"use strict";
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
        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', gmoResultModel.OrderID);
        chevre_domain_1.Models.Reservation.find({
            payment_no: gmoResultModel.OrderID
        }, '_id purchaser_group pre_customer', (err, reservations) => {
            this.logger.info('reservations found.', err, reservations.length);
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            // チェック文字列
            // 8 ＋ 23 ＋ 24 ＋ 25 ＋ 39 + 14 ＋ショップパスワード
            const md5hash = crypto.createHash('md5');
            md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.CvsCode}${gmoResultModel.CvsConfNo}${gmoResultModel.CvsReceiptNo}${gmoResultModel.PaymentTerm}${gmoResultModel.TranDate}${conf.get('gmo_payment_shop_password')}`, 'utf8');
            const checkString = md5hash.digest('hex');
            this.logger.info('CheckString must be ', checkString);
            if (checkString !== gmoResultModel.CheckString) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            // 決済待ちステータスへ変更
            this.logger.info('updating reservations by paymentNo...', gmoResultModel.OrderID);
            chevre_domain_1.Models.Reservation.update({ payment_no: gmoResultModel.OrderID }, {
                gmo_shop_id: gmoResultModel.ShopID,
                gmo_amount: gmoResultModel.Amount,
                gmo_tax: gmoResultModel.Tax,
                gmo_cvs_code: gmoResultModel.CvsCode,
                gmo_cvs_conf_no: gmoResultModel.CvsConfNo,
                gmo_cvs_receipt_no: gmoResultModel.CvsReceiptNo,
                gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl,
                gmo_payment_term: gmoResultModel.PaymentTerm,
                updated_user: 'GMOReserveCsvController'
            }, { multi: true }, (updateReservationErr, raw) => {
                this.logger.info('reservations updated.', updateReservationErr, raw);
                if (updateReservationErr)
                    return this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
                // 仮予約完了メールキュー追加(あれば更新日時を更新するだけ)
                this.logger.info('creating reservationEmailCue...');
                chevre_domain_1.Models.ReservationEmailCue.findOneAndUpdate({
                    payment_no: gmoResultModel.OrderID,
                    template: chevre_domain_3.ReservationEmailCueUtil.TEMPLATE_TEMPORARY
                }, {
                    $set: { updated_at: Date.now() },
                    $setOnInsert: { status: chevre_domain_3.ReservationEmailCueUtil.STATUS_UNSENT }
                }, {
                    upsert: true,
                    new: true
                }, (updateCueErr, cue) => {
                    this.logger.info('reservationEmailCue created.', updateCueErr, cue);
                    if (updateCueErr) {
                    }
                    this.logger.info('redirecting to waitingSettlement...');
                    // 購入者区分による振り分け
                    const group = reservations[0].get('purchaser_group');
                    switch (group) {
                        case chevre_domain_2.ReservationUtil.PURCHASER_GROUP_MEMBER:
                            this.res.redirect(this.router.build('member.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
                            break;
                        default:
                            if (reservations[0].get('pre_customer')) {
                                this.res.redirect(this.router.build('pre.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
                            }
                            else {
                                this.res.redirect(this.router.build('customer.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
                            }
                            break;
                    }
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCvsController;
