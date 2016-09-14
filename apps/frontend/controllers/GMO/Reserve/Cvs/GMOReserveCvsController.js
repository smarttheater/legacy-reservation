"use strict";
const ReserveBaseController_1 = require("../../../ReserveBaseController");
const GMOUtil_1 = require("../../../../../common/Util/GMO/GMOUtil");
const Models_1 = require("../../../../../common/models/Models");
const ReservationUtil_1 = require("../../../../../common/models/Reservation/ReservationUtil");
const GMONotificationResponseModel_1 = require("../../../../models/Reserve/GMONotificationResponseModel");
const crypto = require("crypto");
const conf = require("config");
const moment = require("moment");
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
            gmo_payment_term: gmoResultModel.PaymentTerm
        };
        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', gmoResultModel.OrderID);
        Models_1.default.Reservation.find({
            payment_no: gmoResultModel.OrderID
        }, '_id purchaser_group', (err, reservations) => {
            this.logger.info('reservations found.', err, reservations.length);
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            // チェック文字列
            // 8 ＋ 23 ＋ 24 ＋ 25 ＋ 39 + 14 ＋ショップパスワード
            let md5hash = crypto.createHash('md5');
            md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.CvsCode}${gmoResultModel.CvsConfNo}${gmoResultModel.CvsReceiptNo}${gmoResultModel.PaymentTerm}${gmoResultModel.TranDate}${conf.get('gmo_payment_shop_password')}`, 'utf8');
            let checkString = md5hash.digest('hex');
            this.logger.info('CheckString must be ', checkString);
            if (checkString !== gmoResultModel.CheckString) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            this.logger.info('processChangeStatus2waitingSettlement processing...update:', update);
            this.processChangeStatus2waitingSettlement(gmoResultModel.OrderID, update, (err) => {
                this.logger.info('processChangeStatus2waitingSettlement processed.', err);
                // 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
                if (err)
                    return this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
                this.logger.info('redirecting to waitingSettlement...');
                // 購入者区分による振り分け
                let group = reservations[0].get('purchaser_group');
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
                    gmo_status: gmoNotificationModel.Status
                };
                // 内容の整合性チェック
                this.logger.info('finding reservations...payment_no:', paymentNo);
                Models_1.default.Reservation.find({
                    payment_no: paymentNo
                }, '_id purchased_at gmo_shop_pass_string', (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations.length);
                    if (err)
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    if (reservations.length === 0)
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    // チェック文字列
                    let shopPassString = GMOUtil_1.default.createShopPassString(gmoNotificationModel.ShopID, gmoNotificationModel.OrderID, gmoNotificationModel.Amount, conf.get('gmo_payment_shop_password'), moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss'));
                    this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                    if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    this.logger.info('processFixReservations processing... update:', update);
                    this.processFixReservations(paymentNo, update, (err) => {
                        this.logger.info('processFixReservations processed.', err);
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
            case GMOUtil_1.default.STATUS_CVS_REQSUCCESS:
                // 決済待ちステータスへ変更
                update = {
                    gmo_shop_id: gmoNotificationModel.ShopID,
                    gmo_amount: gmoNotificationModel.Amount,
                    gmo_tax: gmoNotificationModel.Tax,
                    gmo_cvs_code: gmoNotificationModel.CvsCode,
                    gmo_cvs_conf_no: gmoNotificationModel.CvsConfNo,
                    gmo_cvs_receipt_no: gmoNotificationModel.CvsReceiptNo,
                    gmo_payment_term: gmoNotificationModel.PaymentTerm
                };
                // 内容の整合性チェック
                this.logger.info('finding reservations...payment_no:', paymentNo);
                Models_1.default.Reservation.find({
                    payment_no: paymentNo
                }, '_id purchased_at gmo_shop_pass_string', (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations.length);
                    if (err)
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    if (reservations.length === 0)
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    // チェック文字列
                    let shopPassString = GMOUtil_1.default.createShopPassString(gmoNotificationModel.ShopID, gmoNotificationModel.OrderID, gmoNotificationModel.Amount, conf.get('gmo_payment_shop_password'), moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss'));
                    this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                    if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    this.logger.info('processChangeStatus2waitingSettlement processing... update:', update);
                    this.processChangeStatus2waitingSettlement(paymentNo, update, (err) => {
                        this.logger.info('processChangeStatus2waitingSettlement processed.', err);
                        if (err) {
                            this.logger.info('sending response RecvRes_NG...');
                            this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                        }
                        else {
                            this.logger.info('sending response RecvRes_OK...');
                            this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                        }
                    });
                });
                break;
            case GMOUtil_1.default.STATUS_CVS_UNPROCESSED:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                break;
            case GMOUtil_1.default.STATUS_CVS_PAYFAIL: // 決済失敗
            case GMOUtil_1.default.STATUS_CVS_EXPIRED: // 期限切れ
            case GMOUtil_1.default.STATUS_CVS_CANCEL:
                // 空席に戻す
                this.logger.info('finding reservations...payment_no:', paymentNo);
                Models_1.default.Reservation.find({
                    payment_no: paymentNo
                }, '_id purchased_at gmo_shop_pass_string', (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations.length);
                    if (err)
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    if (reservations.length === 0)
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    // チェック文字列
                    let shopPassString = GMOUtil_1.default.createShopPassString(gmoNotificationModel.ShopID, gmoNotificationModel.OrderID, gmoNotificationModel.Amount, conf.get('gmo_payment_shop_password'), moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss'));
                    this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                    if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                        return this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    // キャンセル
                    this.logger.info('removing reservations...payment_no:', paymentNo);
                    let promises = reservations.map((reservation) => {
                        return new Promise((resolve, reject) => {
                            this.logger.info('removing reservation...', reservation.get('_id'));
                            reservation.remove((err) => {
                                this.logger.info('reservation removed.', reservation.get('_id'), err);
                                (err) ? reject(err) : resolve();
                            });
                        });
                    });
                    Promise.all(promises).then(() => {
                        this.logger.info('sending response RecvRes_OK...');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                    }, (err) => {
                        this.logger.info('sending response RecvRes_NG...');
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    });
                });
                break;
            default:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
        }
    }
    /**
     * 決済待ちステータスへ変更する
     *
     * @param {string[]} reservationIds 予約IDリスト
     * @param {Object} update 追加更新パラメータ
     */
    processChangeStatus2waitingSettlement(paymentNo, update, cb) {
        update['status'] = ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT;
        update['updated_user'] = 'GMOReserveCsvController';
        // 決済待ちステータスへ変更
        this.logger.info('updating reservations by paymentNo...', paymentNo, update);
        Models_1.default.Reservation.update({
            payment_no: paymentNo
        }, update, {
            multi: true
        }, (err, raw) => {
            this.logger.info('reservations updated.', err, raw);
            if (err)
                return cb(err);
            // 仮予約完了メールキュー追加
            this.logger.info('creating reservationEmailCue...');
            Models_1.default.ReservationEmailCue.create({
                payment_no: paymentNo,
                is_sent: false
            }, (err, cue) => {
                this.logger.info('reservationEmailCue created.', err, cue);
                if (err) {
                }
                cb(null);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCvsController;
