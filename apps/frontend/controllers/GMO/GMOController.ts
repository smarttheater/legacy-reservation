import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import GMOUtil from '../../../common/Util/GMO/GMOUtil';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';
import GMOResultModel from '../../models/Reserve/GMOResultModel';
import GMONotificationModel from '../../models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../models/Reserve/GMONotificationResponseModel';
import moment = require('moment');
import conf = require('config');
import querystring = require('querystring');

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
            processed: false
        }, (err, count) => {
            this.logger.info('count is', count);
            if (err) return this.res.send(GMONotificationResponseModel.RecvRes_NG);
            this.res.send(GMONotificationResponseModel.RecvRes_OK);
        });
    }
}
