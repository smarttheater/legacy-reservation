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
const crypto = require("crypto");
const util = require("util");
const ReserveBaseController_1 = require("../../../ReserveBaseController");
/**
 * GMOクレジットカード決済コントローラー
 *
 * @export
 * @class GMOReserveCreditController
 * @extends {ReserveBaseController}
 */
class GMOReserveCreditController extends ReserveBaseController_1.default {
    /**
     * GMOからの結果受信
     */
    result(gmoResultModel) {
        return __awaiter(this, void 0, void 0, function* () {
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
                // 8 ＋ 9 ＋ 10 ＋ 11 ＋ 12 ＋ 13 ＋ 14 ＋ ショップパスワード
                const data2cipher = util.format('%s%s%s%s%s%s%s%s', gmoResultModel.OrderID, gmoResultModel.Forwarded, gmoResultModel.Method, gmoResultModel.PayTimes, gmoResultModel.Approve, gmoResultModel.TranID, gmoResultModel.TranDate, process.env.GMO_SHOP_PASS);
                const checkString = crypto.createHash('md5').update(data2cipher, 'utf8').digest('hex');
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
                this.logger.info('processFixReservations processing... update:', update);
                yield this.processFixReservations(gmoResultModel.OrderID, update);
                this.logger.info('processFixReservations processed.');
            }
            catch (error) {
                // 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
                this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
                return;
            }
            this.logger.info('redirecting to complete...');
            // 購入者区分による振り分け
            const group = reservations[0].get('purchaser_group');
            switch (group) {
                case chevre_domain_2.ReservationUtil.PURCHASER_GROUP_MEMBER:
                    this.res.redirect(`/member/reserve/${gmoResultModel.OrderID}/complete`);
                    break;
                default:
                    if (reservations[0].get('pre_customer') !== undefined && reservations[0].get('pre_customer') !== null) {
                        this.res.redirect(`/pre/reserve/${gmoResultModel.OrderID}/complete`);
                    }
                    else {
                        this.res.redirect(`/customer/reserve/${gmoResultModel.OrderID}/complete`);
                    }
                    break;
            }
        });
    }
}
exports.default = GMOReserveCreditController;
