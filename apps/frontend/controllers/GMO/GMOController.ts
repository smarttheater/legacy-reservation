import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import GMONotificationModel from '../../models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../models/Reserve/GMONotificationResponseModel';

export default class GMOController extends BaseController {
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
    public notify(): void {
        let gmoNotificationModel = GMONotificationModel.parse(this.req.body);
        this.logger.info('gmoNotificationModel is', gmoNotificationModel);

        if (!gmoNotificationModel.OrderID) {
            this.res.send(GMONotificationResponseModel.RecvRes_OK);
            return;
        }

        // 何を最低限保管する？
        Models.GMONotification.create({
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

            processed: false
        }, (err, notification) => {
            this.logger.info('notification created.', notification);
            if (err) return this.res.send(GMONotificationResponseModel.RecvRes_NG);
            this.res.send(GMONotificationResponseModel.RecvRes_OK);
        });
    }
}
