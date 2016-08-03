"use strict";
const ReserveBaseController_1 = require('../../../ReserveBaseController');
const GMOUtil_1 = require('../../../../../common/Util/GMO/GMOUtil');
const Models_1 = require('../../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../../common/models/Reservation/ReservationUtil');
const GMONotificationResponseModel_1 = require('../../../../models/Reserve/GMONotificationResponseModel');
class GMOReserveCvsController extends ReserveBaseController_1.default {
    /**
     * GMOからの結果受信
     */
    result(gmoResultModel) {
        // 決済待ちステータスへ変更
        let update = {
            gmo_shop_id: gmoResultModel.ShopID,
            gmo_amount: gmoResultModel.Amount,
            gmo_tax: gmoResultModel.Tax,
            gmo_cvs_code: gmoResultModel.CvsCode,
            gmo_cvs_conf_no: gmoResultModel.CvsConfNo,
            gmo_cvs_receipt_no: gmoResultModel.CvsReceiptNo,
            gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl,
            status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
            updated_user: 'GMOReserveCvsController'
        };
        this.logger.info('updating reservations...update:', update);
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
            this.logger.info('redirecting to waitingSettlement...');
            // 購入者区分による振り分け
            Models_1.default.Reservation.findOne({ payment_no: gmoResultModel.OrderID }, 'purchaser_group', (err, reservationDocument) => {
                if (err) {
                }
                let group = reservationDocument.get('purchaser_group');
                switch (group) {
                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                        this.res.redirect(this.router.build('member.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
                        break;
                    default:
                        this.res.redirect(this.router.build('customer.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
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
        let update;
        switch (gmoNotificationModel.Status) {
            case GMOUtil_1.default.STATUS_CVS_PAYSUCCESS:
                update = {
                    gmo_status: gmoNotificationModel.Status,
                    status: ReservationUtil_1.default.STATUS_RESERVED,
                    updated_user: 'GMOReserveCvsController'
                };
                // GMOステータス変更
                this.logger.info('updating reservations...update:', update);
                Models_1.default.Reservation.update({
                    payment_no: paymentNo,
                    status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT
                }, update, {
                    multi: true
                }, (err, affectedRows, raw) => {
                    this.logger.info('reservations updated.', err, affectedRows);
                    if (err) {
                        // TODO
                        this.logger.info('sending response RecvRes_NG...');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    else {
                        // TODO 予約できていない在庫があった場合
                        // TODO メール送信はバッチ処理？
                        this.logger.error('sending response RecvRes_OK... ');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                    }
                });
                break;
            case GMOUtil_1.default.STATUS_CVS_REQSUCCESS:
                // 決済待ちステータスへ変更
                update = {
                    gmo_shop_id: gmoNotificationModel.ShopID,
                    gmo_amount: gmoNotificationModel.Amount,
                    gmo_tax: gmoNotificationModel.Tax,
                    gmo_cvs_code: gmoNotificationModel.CvsCode,
                    gmo_cvs_conf_no: gmoNotificationModel.CvsConfNo,
                    gmo_cvs_receipt_no: gmoNotificationModel.CvsReceiptNo,
                    status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
                    updated_user: 'GMOReserveCvsController'
                };
                this.logger.info('updating reservations...update:', update);
                Models_1.default.Reservation.update({
                    payment_no: paymentNo,
                    status: ReservationUtil_1.default.STATUS_TEMPORARY
                }, update, {
                    multi: true
                }, (err, affectedRows, raw) => {
                    this.logger.info('reservations updated.', err, affectedRows);
                    if (err) {
                        // TODO
                        this.logger.info('sending response RecvRes_NG...');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    else {
                        // TODO 予約できていない在庫があった場合
                        // TODO メール送信はバッチ処理？
                        this.logger.error('sending response RecvRes_OK... ');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                    }
                });
                break;
            case GMOUtil_1.default.STATUS_CVS_UNPROCESSED:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                break;
            case GMOUtil_1.default.STATUS_CVS_PAYFAIL: // 決済失敗
            case GMOUtil_1.default.STATUS_CVS_EXPIRED: // 期限切れ
            case GMOUtil_1.default.STATUS_CVS_CANCEL:
                this.logger.error('sending response RecvRes_NG... ');
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
            default:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCvsController;
