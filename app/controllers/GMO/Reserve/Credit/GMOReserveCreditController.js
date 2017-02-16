"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const conf = require("config");
const crypto = require("crypto");
const ReserveBaseController_1 = require("../../../ReserveBaseController");
class GMOReserveCreditController extends ReserveBaseController_1.default {
    /**
     * GMOからの結果受信
     */
    result(gmoResultModel) {
        // 予約完了ステータスへ変更
        const update = {
            gmo_shop_id: gmoResultModel.ShopID,
            gmo_amount: gmoResultModel.Amount,
            gmo_tax: gmoResultModel.Tax,
            gmo_access_id: gmoResultModel.AccessID,
            gmo_forward: gmoResultModel.Forwarded,
            gmo_method: gmoResultModel.Method,
            gmo_approve: gmoResultModel.Approve,
            gmo_tran_id: gmoResultModel.TranID,
            gmo_tran_date: gmoResultModel.TranDate,
            gmo_pay_type: gmoResultModel.PayType,
            gmo_status: gmoResultModel.JobCd
        };
        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', gmoResultModel.OrderID);
        ttts_domain_1.Models.Reservation.find({
            payment_no: gmoResultModel.OrderID
        }, '_id purchaser_group pre_customer', (err, reservations) => {
            this.logger.info('reservations found.', err, reservations.length);
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            // チェック文字列
            // 8 ＋ 9 ＋ 10 ＋ 11 ＋ 12 ＋ 13 ＋ 14 ＋ ショップパスワード
            const md5hash = crypto.createHash('md5');
            md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.Forwarded}${gmoResultModel.Method}${gmoResultModel.PayTimes}${gmoResultModel.Approve}${gmoResultModel.TranID}${gmoResultModel.TranDate}${conf.get('gmo_payment_shop_password')}`, 'utf8');
            const checkString = md5hash.digest('hex');
            this.logger.info('CheckString must be ', checkString);
            if (checkString !== gmoResultModel.CheckString) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            this.logger.info('processFixReservations processing... update:', update);
            this.processFixReservations(gmoResultModel.OrderID, update, (fixReservationsErr) => {
                this.logger.info('processFixReservations processed.', fixReservationsErr);
                // 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
                if (fixReservationsErr)
                    return this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
                this.logger.info('redirecting to complete...');
                // 購入者区分による振り分け
                const group = reservations[0].get('purchaser_group');
                switch (group) {
                    case ttts_domain_2.ReservationUtil.PURCHASER_GROUP_MEMBER:
                        this.res.redirect(this.router.build('member.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        break;
                    default:
                        if (reservations[0].get('pre_customer')) {
                            this.res.redirect(this.router.build('pre.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        }
                        else {
                            this.res.redirect(this.router.build('customer.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        }
                        break;
                }
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCreditController;
