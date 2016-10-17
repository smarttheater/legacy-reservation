"use strict";
const ReserveBaseController_1 = require('../../../ReserveBaseController');
const GMOUtil_1 = require('../../../../../common/Util/GMO/GMOUtil');
const Models_1 = require('../../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../../common/models/Reservation/ReservationUtil');
const GMONotificationResponseModel_1 = require('../../../../models/Reserve/GMONotificationResponseModel');
const conf = require('config');
const crypto = require('crypto');
const moment = require('moment');
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
            payment_no: gmoResultModel.OrderID
        }, '_id purchaser_group pre_customer', (err, reservations) => {
            this.logger.info('reservations found.', err, reservations.length);
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            // チェック文字列
            // 8 ＋ 9 ＋ 10 ＋ 11 ＋ 12 ＋ 13 ＋ 14 ＋ ショップパスワード
            let md5hash = crypto.createHash('md5');
            md5hash.update(`${gmoResultModel.OrderID}${gmoResultModel.Forwarded}${gmoResultModel.Method}${gmoResultModel.PayTimes}${gmoResultModel.Approve}${gmoResultModel.TranID}${gmoResultModel.TranDate}${conf.get('gmo_payment_shop_password')}`, 'utf8');
            let checkString = md5hash.digest('hex');
            this.logger.info('CheckString must be ', checkString);
            if (checkString !== gmoResultModel.CheckString) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            this.logger.info('processFixReservations processing... update:', update);
            this.processFixReservations(gmoResultModel.OrderID, update, (err) => {
                this.logger.info('processFixReservations processed.', err);
                // 売上取消したいところだが、結果通知も裏で動いているので、うかつにできない
                if (err)
                    return this.next(new Error(this.req.__('Message.ReservationNotCompleted')));
                this.logger.info('redirecting to complete...');
                // 購入者区分による振り分け
                let group = reservations[0].get('purchaser_group');
                switch (group) {
                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                        this.res.redirect(this.router.build('member.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        break;
                    default:
                        if (reservations[0].get('pre_customer')) {
                            this.res.redirect(this.router.build('pre.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        }
                        else {
                            this.res.redirect(this.router.build('customer.reserve.complete', { paymentNo: gmoResultModel.OrderID }));
                        }
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
            case GMOUtil_1.default.STATUS_CREDIT_UNPROCESSED:
                // 未決済の場合、放置
                // ユーザーが「戻る」フローでキャンセルされる、あるいは、時間経過で空席になる
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                break;
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
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                break;
            // 空席に戻す(つくったけれども、連動しない方向で仕様決定)
            /*
            this.logger.info('finding reservations...payment_no:', paymentNo);
            Models.Reservation.find(
                {
                    payment_no: paymentNo
                },
                '_id purchased_at gmo_shop_pass_string',
                (err, reservations) => {
                    this.logger.info('reservations found.', err, reservations.length);
                    if (err) return this.res.send(GMONotificationResponseModel.RecvRes_NG);
                    if (reservations.length === 0) return this.res.send(GMONotificationResponseModel.RecvRes_OK); // 予約なければもう通知必要ない

                    // チェック文字列
                    let shopPassString = GMOUtil.createShopPassString(
                        gmoNotificationModel.ShopID,
                        gmoNotificationModel.OrderID,
                        gmoNotificationModel.Amount,
                        conf.get<string>('gmo_payment_shop_password'),
                        moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss')
                    );
                    this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                    if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                        return this.res.send(GMONotificationResponseModel.RecvRes_NG);
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
                        this.res.send(GMONotificationResponseModel.RecvRes_OK);
                    }, (err) => {
                        this.logger.info('sending response RecvRes_NG...');
                        this.res.send(GMONotificationResponseModel.RecvRes_NG);
                    });
                }
            );

            break;
            */
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
