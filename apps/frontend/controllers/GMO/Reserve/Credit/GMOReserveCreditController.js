"use strict";
const ReserveBaseController_1 = require('../../../ReserveBaseController');
const GMOUtil_1 = require('../../../../../common/Util/GMO/GMOUtil');
const ReservationUtil_1 = require('../../../../../common/models/Reservation/ReservationUtil');
const GMONotificationResponseModel_1 = require('../../../../models/Reserve/GMONotificationResponseModel');
const conf = require('config');
const request = require('request');
const querystring = require('querystring');
class GMOReserveCreditController extends ReserveBaseController_1.default {
    /**
     * GMOからの結果受信
     */
    result(gmoResultModel) {
        // TODO 支払い期限過ぎていたらキャンセル(10分？)
        // 予約完了ステータスへ変更
        let update = {
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
        this.logger.info('fixing reservations... update:', update);
        this.processFixReservations(gmoResultModel.OrderID, update, (err, reservationDocuments) => {
            if (err) {
                // TODO 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
                // this.alterTran2void(gmoResultModel, (err: Error) => {
                //     if (err) {
                //     }
                //     this.logger.info('sending response RecvRes_NG...');
                //     this.res.send(GMONotificationResponseModel.RecvRes_NG);
                // });
                this.next(new Error('failed in payment.'));
            }
            else {
                this.logger.info('redirecting to complete...');
                // 購入者区分による振り分け
                let group = reservationDocuments[0].get('purchaser_group');
                switch (group) {
                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                        this.res.redirect(this.router.build('member.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        break;
                    default:
                        this.res.redirect(this.router.build('customer.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        break;
                }
            }
        });
    }
    /**
     * GMO結果通知受信
     */
    notify(gmoNotificationModel) {
        let paymentNo = gmoNotificationModel.OrderID;
        let promises = [];
        let update;
        switch (gmoNotificationModel.Status) {
            case GMOUtil_1.default.STATUS_CREDIT_CAPTURE:
                // TODO 支払い期限過ぎていたらキャンセル(10分？)
                // 予約完了ステータスへ変更
                update = {
                    gmo_shop_id: gmoNotificationModel.ShopID,
                    gmo_amount: gmoNotificationModel.Amount,
                    gmo_tax: gmoNotificationModel.Tax,
                    gmo_access_id: gmoNotificationModel.AccessID,
                    gmo_forward: gmoNotificationModel.Forward,
                    gmo_method: gmoNotificationModel.Method,
                    gmo_approve: gmoNotificationModel.Approve,
                    gmo_tran_id: gmoNotificationModel.TranID,
                    gmo_tran_date: gmoNotificationModel.TranDate,
                    gmo_pay_type: gmoNotificationModel.PayType,
                    gmo_status: gmoNotificationModel.Status
                };
                this.logger.info('fixing reservations... update:', update);
                this.processFixReservations(paymentNo, update, (err, reservationDocuments) => {
                    if (err) {
                        // AccessPassが************なので、売上取消要求は行えない
                        // 失敗した場合、約60分毎に5回再通知されるので、それをリトライとみなす
                        this.logger.info('sending response RecvRes_NG...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    else {
                        // TODO メール送信はバッチ処理？
                        // TODO メールの送信ログ（宛先、件名、本文）を保管して下さい。出来ればBlob（受信拒否等で取れなかった場合の再送用）
                        this.logger.info('sending response RecvRes_OK...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                    }
                });
            case GMOUtil_1.default.STATUS_CREDIT_UNPROCESSED:
            case GMOUtil_1.default.STATUS_CREDIT_AUTHENTICATED:
            case GMOUtil_1.default.STATUS_CREDIT_CHECK:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_AUTH:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_SALES:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_VOID:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_RETURN:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_RETURNX:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_SAUTH:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            default:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                break;
        }
    }
    /**
     * GMOに対して実売上要求を行う
     */
    alterTran2sales(gmoNotificationModel, cb) {
        let options = {
            url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
            form: {
                ShopID: conf.get('gmo_payment_shop_id'),
                ShopPass: conf.get('gmo_payment_shop_password'),
                AccessID: gmoNotificationModel.AccessID,
                AccessPass: gmoNotificationModel.AccessPass,
                JobCd: GMOUtil_1.default.STATUS_CREDIT_SALES,
                Amount: gmoNotificationModel.Amount
            }
        };
        this.logger.info('requesting... options:', options);
        request.post(options, (error, response, body) => {
            this.logger.info('request processed.', error, response, body);
            if (error) {
                return cb(error);
            }
            if (response.statusCode !== 200) {
                return cb(new Error(body));
            }
            let result = querystring.parse(body);
            // AccessID
            // AccessPass
            // Forward
            // Approve
            // TranID
            // TranDate
            // ErrCode
            // ErrInfo
            if (result.hasOwnProperty('ErrCode')) {
                // TODO
                cb(new Error(body));
            }
            else {
                cb(null);
            }
        });
    }
    /**
     * GMOに対して取消要求を行う
     */
    alterTran2void(gmoNotificationModel, cb) {
        let options = {
            url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
            form: {
                ShopID: conf.get('gmo_payment_shop_id'),
                ShopPass: conf.get('gmo_payment_shop_password'),
                AccessID: gmoNotificationModel.AccessID,
                AccessPass: gmoNotificationModel.AccessPass,
                JobCd: GMOUtil_1.default.STATUS_CREDIT_VOID,
                Amount: gmoNotificationModel.Amount
            }
        };
        this.logger.info('requesting... options:', options);
        request.post(options, (error, response, body) => {
            this.logger.info('request processed.', error, response, body);
            if (error) {
                return cb(error);
            }
            if (response.statusCode !== 200) {
                return cb(new Error(body));
            }
            let result = querystring.parse(body);
            // AccessID
            // AccessPass
            // Forward
            // Approve
            // TranID
            // TranDate
            // ErrCode
            // ErrInfo
            if (result.hasOwnProperty('ErrCode')) {
                // TODO
                cb(new Error(body));
            }
            else {
                cb(null);
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCreditController;
