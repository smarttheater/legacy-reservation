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
            gmo_cvs_receipt_url: gmoResultModel.CvsReceiptUrl
        };
        this.logger.info('changing status to STATUS_WAITING_SETTLEMENT...update:', update);
        this.processChangeStatus2waitingSettlement(gmoResultModel.OrderID, update, (err, reservationDocuments) => {
            if (err) {
                // TODO 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
                this.next(new Error('failed in payment.'));
            }
            else {
                this.logger.info('redirecting to waitingSettlement...');
                // 購入者区分による振り分け
                let group = reservationDocuments[0].get('purchaser_group');
                switch (group) {
                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                        this.res.redirect(this.router.build('member.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
                        break;
                    default:
                        this.res.redirect(this.router.build('customer.reserve.waitingSettlement', { paymentNo: gmoResultModel.OrderID }));
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
        let update;
        switch (gmoNotificationModel.Status) {
            case GMOUtil_1.default.STATUS_CVS_PAYSUCCESS:
                update = {
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
                break;
            case GMOUtil_1.default.STATUS_CVS_REQSUCCESS:
                // 決済待ちステータスへ変更
                update = {
                    gmo_shop_id: gmoNotificationModel.ShopID,
                    gmo_amount: gmoNotificationModel.Amount,
                    gmo_tax: gmoNotificationModel.Tax,
                    gmo_cvs_code: gmoNotificationModel.CvsCode,
                    gmo_cvs_conf_no: gmoNotificationModel.CvsConfNo,
                    gmo_cvs_receipt_no: gmoNotificationModel.CvsReceiptNo
                };
                this.logger.info('changing status to STATUS_WAITING_SETTLEMENT...update:', update);
                this.processChangeStatus2waitingSettlement(gmoNotificationModel.OrderID, update, (err, reservationDocuments) => {
                    if (err) {
                        this.logger.info('sending response RecvRes_NG...');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    else {
                        this.logger.info('sending response RecvRes_OK...');
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
    /**
     * 購入番号から全ての予約を完了にする
     *
     * @param {string} paymentNo 購入番号
     * @param {Object} update 追加更新パラメータ
     */
    processChangeStatus2waitingSettlement(paymentNo, update, cb) {
        let promises = [];
        let reservationDocuments = [];
        update['status'] = ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT;
        update['updated_user'] = 'GMOReserveCreditController';
        // 予約完了ステータスへ変更
        this.logger.info('finding reservations...paymentNo:', paymentNo);
        Models_1.default.Reservation.find({
            payment_no: paymentNo
        }, '_id', (err, reservationDocuments) => {
            for (let reservationDocument of reservationDocuments) {
                promises.push(new Promise((resolve, reject) => {
                    this.logger.info('updating reservations...update:', update);
                    Models_1.default.Reservation.findOneAndUpdate({
                        _id: reservationDocument.get('_id'),
                    }, update, {
                        new: true
                    }, (err, reservationDocument) => {
                        this.logger.info('reservation updated.', err, reservationDocument);
                        if (err) {
                            reject();
                        }
                        else {
                            reservationDocuments.push(reservationDocument);
                            resolve();
                        }
                    });
                }));
            }
            ;
            Promise.all(promises).then(() => {
                cb(null, reservationDocuments);
            }, (err) => {
                cb(err, reservationDocuments);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCvsController;
