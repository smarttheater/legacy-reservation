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
const notification_1 = require("../../models/gmo/notification");
const notificationResponse_1 = require("../../models/gmo/notificationResponse");
const BaseController_1 = require("../BaseController");
/**
 * GMOウェブフックコントローラー
 *
 * @export
 * @class GMOController
 * @extends {BaseController}
 */
class GMOController extends BaseController_1.default {
    /**
     * GMO結果通知受信
     *
     * お客様は、受信したHTTPリクエストに対するHTTPレスポンスが必要となります。
     * 返却値については、以下のいずれか
     * 0：受信OK ／ 1：受信失敗
     *
     * タイムアウトについて
     * 結果通知プログラム機能によって、指定URLへデータ送信を行った場合に15秒以内に返信が無いとタイムアウトとして処理を行います。
     * 加盟店様側からの正常応答が確認出来なかった場合は約60分毎に5回再送いたします。
     */
    notify() {
        return __awaiter(this, void 0, void 0, function* () {
            const gmoNotificationModel = notification_1.default.parse(this.req.body);
            this.logger.info('gmoNotificationModel is', gmoNotificationModel);
            if (gmoNotificationModel.OrderID === undefined) {
                this.res.send(notificationResponse_1.default.RECV_RES_OK);
                return;
            }
            // 何を最低限保管する？
            try {
                const notification = yield chevre_domain_1.Models.GMONotification.create({
                    shop_id: gmoNotificationModel.ShopID,
                    order_id: gmoNotificationModel.OrderID,
                    status: gmoNotificationModel.Status,
                    job_cd: gmoNotificationModel.JobCd,
                    amount: gmoNotificationModel.Amount,
                    pay_type: gmoNotificationModel.PayType,
                    tax: gmoNotificationModel.Tax,
                    access_id: gmoNotificationModel.AccessID,
                    forward: gmoNotificationModel.Forward,
                    method: gmoNotificationModel.Method,
                    approve: gmoNotificationModel.Approve,
                    tran_id: gmoNotificationModel.TranID,
                    tran_date: gmoNotificationModel.TranDate,
                    cvs_code: gmoNotificationModel.CvsCode,
                    cvs_conf_no: gmoNotificationModel.CvsConfNo,
                    cvs_receipt_no: gmoNotificationModel.CvsReceiptNo,
                    payment_term: gmoNotificationModel.PaymentTerm,
                    process_status: chevre_domain_1.GMONotificationUtil.PROCESS_STATUS_UNPROCESSED
                });
                this.logger.info('notification created.', notification);
                this.res.send(notificationResponse_1.default.RECV_RES_OK);
            }
            catch (error) {
                this.res.send(notificationResponse_1.default.RECV_RES_NG);
            }
        });
    }
}
exports.default = GMOController;
