"use strict";
const ReserveBaseController_1 = require('../../../ReserveBaseController');
const GMOUtil_1 = require('../../../../../common/Util/GMO/GMOUtil');
const Models_1 = require('../../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../../common/models/Reservation/ReservationUtil');
const GMONotificationResponseModel_1 = require('../../../../models/Reserve/GMONotificationResponseModel');
const conf = require('config');
const request = require('request');
const querystring = require('querystring');
const crypto = require('crypto');
class GMOReserveCreditController extends ReserveBaseController_1.default {
    /**
     * GMOからの結果受信
     */
    result(gmoResultModel) {
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
        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', gmoResultModel.OrderID);
        Models_1.default.Reservation.find({
            payment_no: gmoResultModel.OrderID,
            status: { $in: [ReservationUtil_1.default.STATUS_TEMPORARY, ReservationUtil_1.default.STATUS_RESERVED] }
        }, '_id total_charge purchaser_group', (err, reservationDocuments) => {
            this.logger.info('reservations found.', err, reservationDocuments.length);
            if (err) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            if (reservationDocuments.length < 1) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            // 利用金額の整合性
            this.logger.info('Amount must be ', reservationDocuments[0].get('total_charge'));
            if (parseInt(gmoResultModel.Amount) !== reservationDocuments[0].get('total_charge')) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            // チェック文字列
            // 8 ＋ 9 ＋ 10 ＋ 11 ＋ 12 ＋ 13 ＋ 14 ＋ ショップパスワード
            let md5hash = crypto.createHash('md5');
            md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.Forwarded}${gmoResultModel.Method}${gmoResultModel.PayTimes}${gmoResultModel.Approve}${gmoResultModel.TranID}${gmoResultModel.TranDate}${conf.get('gmo_payment_shop_password')}`, 'utf8');
            let checkString = md5hash.digest('hex');
            this.logger.info('CheckString must be ', checkString);
            if (checkString !== gmoResultModel.CheckString) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            let reservationIds = reservationDocuments.map((reservationDocument) => {
                return reservationDocument.get('_id');
            });
            this.logger.info('fixing reservations... update:', update);
            this.processFixReservations(gmoResultModel.OrderID, reservationIds, update, (err) => {
                if (err) {
                    // 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
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
        });
    }
    /**
     * GMO結果通知受信
     */
    notify(gmoNotificationModel) {
        let paymentNo = gmoNotificationModel.OrderID;
        let update;
        switch (gmoNotificationModel.Status) {
            case GMOUtil_1.default.STATUS_CREDIT_CAPTURE:
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
                // 内容の整合性チェック
                this.logger.info('finding reservations...payment_no:', gmoNotificationModel.OrderID);
                Models_1.default.Reservation.find({
                    payment_no: gmoNotificationModel.OrderID,
                    status: { $in: [ReservationUtil_1.default.STATUS_TEMPORARY, ReservationUtil_1.default.STATUS_RESERVED] }
                }, '_id total_charge', (err, reservationDocuments) => {
                    this.logger.info('reservations found.', err, reservationDocuments.length);
                    if (err) {
                        return this.next(new Error('unexpected error.'));
                    }
                    if (reservationDocuments.length < 1) {
                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                    // 利用金額の整合性
                    this.logger.info('Amount must be ', reservationDocuments[0].get('total_charge'));
                    if (parseInt(gmoNotificationModel.Amount) !== reservationDocuments[0].get('total_charge')) {
                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                    let reservationIds = reservationDocuments.map((reservationDocument) => {
                        return reservationDocument.get('_id');
                    });
                    this.logger.info('fixing reservations... update:', update);
                    this.processFixReservations(paymentNo, reservationIds, update, (err) => {
                        if (err) {
                            // AccessPassが************なので、売上取消要求は行えない
                            // 失敗した場合、約60分毎に5回再通知されるので、それをリトライとみなす
                            this.logger.info('sending response RecvRes_NG...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                            this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                        }
                        else {
                            this.logger.info('sending response RecvRes_OK...gmoNotificationModel.Status:', gmoNotificationModel.Status);
                            this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                        }
                    });
                });
                break;
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
