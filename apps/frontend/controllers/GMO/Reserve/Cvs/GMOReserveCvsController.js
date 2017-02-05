"use strict";
const ReserveBaseController_1 = require("../../../ReserveBaseController");
const Models_1 = require("../../../../../common/models/Models");
const ReservationUtil_1 = require("../../../../../common/models/Reservation/ReservationUtil");
const ReservationEmailCueUtil_1 = require("../../../../../common/models/ReservationEmailCue/ReservationEmailCueUtil");
const crypto = require("crypto");
const conf = require("config");
class GMOReserveCvsController extends ReserveBaseController_1.default {
    /**
     * GMOからの結果受信
     */
    result(gmoResultModel) {
        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', gmoResultModel.OrderID);
        Models_1.default.Reservation.find({
            payment_no: gmoResultModel.OrderID
        }, '_id purchaser_group pre_customer', (err, reservations) => {
            this.logger.info('reservations found.', err, reservations.length);
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            // チェック文字列
            // 8 ＋ 23 ＋ 24 ＋ 25 ＋ 39 + 14 ＋ショップパスワード
            let md5hash = crypto.createHash('md5');
            md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.CvsCode}${gmoResultModel.CvsConfNo}${gmoResultModel.CvsReceiptNo}${gmoResultModel.PaymentTerm}${gmoResultModel.TranDate}${conf.get('gmo_payment_shop_password')}`, 'utf8');
            let checkString = md5hash.digest('hex');
            this.logger.info('CheckString must be ', checkString);
            if (checkString !== gmoResultModel.CheckString) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            // 決済待ちステータスへ変更
            this.logger.info('updating reservations by paymentNo...', gmoResultModel.OrderID);
            Models_1.default.Reservation.update({ payment_no: gmoResultModel.OrderID }, {
                gmo_shop_id: gmoResultModel.ShopID,
                gmo_amount: gmoResultModel.Amount,
                gmo_tax: gmoResultModel.Tax,
                gmo_cvs_code: gmoResultModel.CvsCode,
                gmo_cvs_conf_no: gmoResultModel.CvsConfNo,
                gmo_cvs_receipt_no: gmoResultModel.CvsReceiptNo,
                gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl,
                gmo_payment_term: gmoResultModel.PaymentTerm,
                updated_user: 'GMOReserveCsvController'
            }, { multi: true }, (err, raw) => {
                this.logger.info('reservations updated.', err, raw);
                if (err)
                    return this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
                // 仮予約完了メールキュー追加(あれば更新日時を更新するだけ)
                this.logger.info('creating reservationEmailCue...');
                Models_1.default.ReservationEmailCue.findOneAndUpdate({
                    payment_no: gmoResultModel.OrderID,
                    template: ReservationEmailCueUtil_1.default.TEMPLATE_TEMPORARY,
                }, {
                    $set: { updated_at: Date.now() },
                    $setOnInsert: { status: ReservationEmailCueUtil_1.default.STATUS_UNSENT }
                }, {
                    upsert: true,
                    new: true
                }, (err, cue) => {
                    this.logger.info('reservationEmailCue created.', err, cue);
                    if (err) {
                    }
                    this.logger.info('redirecting to waitingSettlement...');
                    // 購入者区分による振り分け
                    let group = reservations[0].get('purchaser_group');
                    switch (group) {
                        case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
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
