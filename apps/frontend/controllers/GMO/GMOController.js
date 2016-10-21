"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const GMONotificationModel_1 = require('../../models/Reserve/GMONotificationModel');
const GMONotificationResponseModel_1 = require('../../models/Reserve/GMONotificationResponseModel');
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
        // for test
        // let body = {
        //     ShopID: 'tshop00024743',
        //     ShopPass: '**********',
        //     AccessID: '75340a34dde2a2f3d77c70a48cd815e3',
        //     AccessPass: '********************************',
        //     OrderID: '40019101113',
        //     Status: 'CAPTURE',
        //     JobCd: 'CAPTURE',
        //     Amount: '1800',
        //     Tax: '0',
        //     Currency: 'JPN',
        //     Forward: '2a99662',
        //     Method: '1',
        //     PayTimes: '',
        //     TranID: '1610181733111111111111871056',
        //     Approve: '8707831',
        //     TranDate: '20161018173356',
        //     ErrCode: '',
        //     ErrInfo: '',
        //     PayType: '0',
        //     CvsCode: '',
        //     CvsConfNo: '',
        //     CvsReceiptNo: ''
        // }
        // for test
        // let body = {
        //     ShopID: 'tshop00024743',
        //     ShopPass: '**********',
        //     AccessID: '422a20615f52ae87a7572561d22a4f92',
        //     AccessPass: '********************************',
        //     OrderID: '40016201113',
        //     Status: 'REQSUCCESS',
        //     JobCd: '',
        //     Amount: '1450',
        //     Tax: '0',
        //     Currency: 'JPN',
        //     Forward: '',
        //     Method: '',
        //     PayTimes: '',
        //     TranID: '16101900000002212555',
        //     Approve: '',
        //     TranDate: '20161019010112',
        //     ErrCode: '',
        //     ErrInfo: '',
        //     PayType: '3',
        //     CvsCode: '10002',
        //     CvsConfNo: '12345',
        //     CvsReceiptNo: 'FM6806472980',
        // }
        // let gmoNotificationModel = GMONotificationModel.parse(body);
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
            processed: false
        }, (err, count) => {
            this.logger.info('count is', count);
            if (err)
                return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
            this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOController;
