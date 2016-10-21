"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const GMONotificationModel_1 = require('../../models/Reserve/GMONotificationModel');
const GMONotificationResponseModel_1 = require('../../models/Reserve/GMONotificationResponseModel');
const GMONotificationUtil_1 = require('../../../common/models/GMONotification/GMONotificationUtil');
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
     *
     */
    notify() {
        let gmoNotificationModel = GMONotificationModel_1.default.parse(this.req.body);
        this.logger.info('gmoNotificationModel is', gmoNotificationModel);
        if (!gmoNotificationModel.OrderID) {
            this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
            return;
        }
        // 何を最低限保管する？
        Models_1.default.GMONotification.create({
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
            process_status: GMONotificationUtil_1.default.PROCESS_STATUS_UNPROCESSED
        }, (err, notification) => {
            this.logger.info('notification created.', notification);
            if (err)
                return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
            this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOController;
