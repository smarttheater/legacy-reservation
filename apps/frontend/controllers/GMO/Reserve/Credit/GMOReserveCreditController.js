"use strict";
const ReserveBaseController_1 = require('../../../ReserveBaseController');
const GMOUtil_1 = require('../../../../../common/Util/GMO/GMOUtil');
const Models_1 = require('../../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../../common/models/Reservation/ReservationUtil');
const GMONotificationResponseModel_1 = require('../../../../models/Reserve/GMONotificationResponseModel');
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
            gmo_tranDate: gmoResultModel.TranDate,
            gmo_pay_type: gmoResultModel.PayType,
            gmo_status: gmoResultModel.JobCd,
            // gmo_cvs_code: gmoResultModel.CvsCode,
            // gmo_cvs_conf_no: gmoResultModel.CvsConfNo,
            // gmo_cvs_receipt_no: gmoResultModel.CvsReceiptNo,
            // gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl,
            status: ReservationUtil_1.default.STATUS_RESERVED,
            updated_user: 'GMOReserveCreditController'
        };
        this.logger.info('updating resertions...update:', update);
        Models_1.default.Reservation.update({
            payment_no: gmoResultModel.OrderID,
            status: ReservationUtil_1.default.STATUS_TEMPORARY
        }, update, {
            multi: true
        }, (err, affectedRows, raw) => {
            this.logger.info('reservations updated.', err, affectedRows);
            if (err) {
            }
            // TODO メール送信はバッチ通知のほうでのみやる
            // TODO 予約できていない在庫があった場合
            this.logger.info('redirecting to complete...');
            // 購入者区分による振り分け
            Models_1.default.Reservation.findOne({ payment_no: gmoResultModel.OrderID }, 'purchaser_group', (err, reservationDocument) => {
                if (err) {
                }
                let group = reservationDocument.get('purchaser_group');
                switch (group) {
                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                        this.res.redirect(this.router.build('member.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        break;
                    default:
                        this.res.redirect(this.router.build('customer.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        break;
                }
            });
        });
    }
    /**
     * GMO結果通知受信
     */
    notify(gmoNotificationModel) {
        let paymentNo = gmoNotificationModel.OrderID;
        switch (gmoNotificationModel.Status) {
            case GMOUtil_1.default.STATUS_CREDIT_CAPTURE:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_UNPROCESSED:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_AUTHENTICATED:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_CHECK:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            case GMOUtil_1.default.STATUS_CREDIT_AUTH:
                // TODO 支払い期限過ぎていたらキャンセル(10分？)
                // 予約完了ステータスへ変更
                let update = {
                    gmo_shop_id: gmoNotificationModel.ShopID,
                    gmo_amount: gmoNotificationModel.Amount,
                    gmo_tax: gmoNotificationModel.Tax,
                    gmo_access_id: gmoNotificationModel.AccessID,
                    gmo_forward: gmoNotificationModel.Forward,
                    gmo_method: gmoNotificationModel.Method,
                    gmo_approve: gmoNotificationModel.Approve,
                    gmo_tran_id: gmoNotificationModel.TranID,
                    gmo_tranDate: gmoNotificationModel.TranDate,
                    gmo_pay_type: gmoNotificationModel.PayType,
                    gmo_status: gmoNotificationModel.Status,
                    status: ReservationUtil_1.default.STATUS_RESERVED,
                    updated_user: 'GMOReserveCreditController'
                };
                this.logger.info('updating resertions...update:', update);
                Models_1.default.Reservation.update({
                    payment_no: paymentNo,
                    status: ReservationUtil_1.default.STATUS_TEMPORARY
                }, update, (err, affectedRows, raw) => {
                    this.logger.info('reservations updated.', err, affectedRows);
                    if (err) {
                        // TODO
                        this.logger.info('sending response RecvRes_NG...');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    else {
                        // TODO 予約できていない在庫があった場合
                        // TODO メール送信はバッチ処理？
                        this.logger.info('sending response RecvRes_OK...');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                    }
                });
                break;
            case GMOUtil_1.default.STATUS_CREDIT_SALES:
                // TODO GMOステータス変更
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
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
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCreditController;
