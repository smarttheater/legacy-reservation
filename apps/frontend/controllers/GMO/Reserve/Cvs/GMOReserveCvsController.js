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
    result(reservationModel, gmoResultModel) {
        // 決済待ちステータスへ変更
        let promises = [];
        reservationModel.reservationIds.forEach((reservationId, index) => {
            let reservation = reservationModel.getReservation(reservationId);
            promises.push(new Promise((resolve, reject) => {
                this.logger.debug('updating reservation status to STATUS_WAITING_SETTLEMENT..._id:', reservationId);
                Models_1.default.Reservation.update({
                    _id: reservationId,
                    status: ReservationUtil_1.default.STATUS_TEMPORARY
                }, {
                    status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
                    updated_user: this.constructor.toString(),
                }, (err, affectedRows) => {
                    this.logger.info('STATUS_TEMPORARY to STATUS_WAITING_SETTLEMENT processed.', err, affectedRows);
                    if (err) {
                        // TODO ログ出力
                        reject();
                    }
                    else {
                        resolve();
                    }
                });
            }));
        });
        Promise.all(promises).then(() => {
            this.logger.info('redirecting to waitingSettlement...');
            if (reservationModel.member) {
                this.res.redirect(this.router.build('member.reserve.waitingSettlement', { token: reservationModel.token }));
            }
            else {
                this.res.redirect(this.router.build('customer.reserve.waitingSettlement', { token: reservationModel.token }));
            }
        }, (err) => {
            // TODO どうする？
            this.next(err);
        });
    }
    /**
     * GMO結果通知受信
     */
    notify(reservationModel, gmoNotificationModel) {
        let promises = [];
        switch (gmoNotificationModel.Status) {
            case GMOUtil_1.default.STATUS_CVS_PAYSUCCESS:
                // 決済待ちの予約を予約完了へ
                // 予約情報セッション削除
                // これ以降、予約情報はローカルに引き回す
                this.logger.info('removing reservationModel... ', reservationModel.toLog());
                reservationModel.remove((err) => {
                    if (err) {
                    }
                    else {
                        // TODO GMOからポストされたパラメータを予約情報に追加する
                        // 予約確定
                        this.logger.info('fixing all... ');
                        this.processFixAll(reservationModel, (err, reservationModel) => {
                            if (err) {
                                // TODO 万が一の対応どうするか
                                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                            }
                            else {
                                // TODO 予約できていない在庫があった場合
                                if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                    this.logger.error('sending response RecvRes_NG... ');
                                    this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                                }
                                else {
                                    // 完了
                                    this.logger.info('sending response RecvRes_OK... ');
                                    this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                                }
                            }
                        });
                    }
                });
                break;
            case GMOUtil_1.default.STATUS_CVS_REQSUCCESS:
                // 決済待ちステータスへ変更
                reservationModel.reservationIds.forEach((reservationId, index) => {
                    let reservation = reservationModel.getReservation(reservationId);
                    promises.push(new Promise((resolve, reject) => {
                        this.logger.debug('updating reservation status to STATUS_WAITING_SETTLEMENT..._id:', reservationId);
                        Models_1.default.Reservation.update({
                            _id: reservationId,
                            status: ReservationUtil_1.default.STATUS_TEMPORARY
                        }, {
                            status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
                            updated_user: this.constructor.toString(),
                        }, (err, affectedRows) => {
                            this.logger.info('STATUS_TEMPORARY to STATUS_WAITING_SETTLEMENT processed.', err, affectedRows);
                            if (err) {
                                // TODO ログ出力
                                reject();
                            }
                            else {
                                resolve();
                            }
                        });
                    }));
                });
                Promise.all(promises).then(() => {
                    this.logger.info('sending response RecvRes_OK... ');
                    this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                }, (err) => {
                    // TODO どうする？
                    this.logger.info('sending response RecvRes_NG... ');
                    this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                });
                break;
            case GMOUtil_1.default.STATUS_CVS_UNPROCESSED:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                break;
            case GMOUtil_1.default.STATUS_CVS_PAYFAIL: // 決済失敗
            case GMOUtil_1.default.STATUS_CVS_EXPIRED: // 期限切れ
            case GMOUtil_1.default.STATUS_CVS_CANCEL:
                this.logger.debug('removing reservationModel... ');
                reservationModel.remove((err) => {
                    if (err) {
                    }
                    else {
                        // 空席に戻す
                        reservationModel.reservationIds.forEach((reservationId, index) => {
                            let reservation = reservationModel.getReservation(reservationId);
                            promises.push(new Promise((resolve, reject) => {
                                this.logger.debug('updating reservation status to STATUS_AVAILABLE..._id:', reservationId);
                                Models_1.default.Reservation.update({
                                    _id: reservationId
                                }, {
                                    status: ReservationUtil_1.default.STATUS_AVAILABLE,
                                    updated_user: this.constructor.toString()
                                }, (err, affectedRows) => {
                                    this.logger.info('STATUS_WAITING_SETTLEMENT to STATUS_AVAILABLE processed.', err, affectedRows);
                                    if (err) {
                                        // TODO ログ出力
                                        reject();
                                    }
                                    else {
                                        resolve();
                                    }
                                });
                            }));
                        });
                        Promise.all(promises).then(() => {
                            this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                        }, (err) => {
                            // TODO どうする？
                            this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                        });
                        this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                });
                break;
            default:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCvsController;
