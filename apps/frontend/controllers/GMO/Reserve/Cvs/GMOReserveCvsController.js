"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ReserveBaseController_1 = require('../../../ReserveBaseController');
var GMOUtil_1 = require('../../../../../common/Util/GMO/GMOUtil');
var Models_1 = require('../../../../../common/models/Models');
var ReservationUtil_1 = require('../../../../../common/models/Reservation/ReservationUtil');
var GMONotificationResponseModel_1 = require('../../../../models/Reserve/GMONotificationResponseModel');
var GMOReserveCvsController = (function (_super) {
    __extends(GMOReserveCvsController, _super);
    function GMOReserveCvsController() {
        _super.apply(this, arguments);
    }
    /**
     * GMOからの結果受信
     */
    GMOReserveCvsController.prototype.result = function (reservationModel, gmoResultModel) {
        var _this = this;
        // 決済待ちステータスへ変更
        var promises = [];
        reservationModel.reservationIds.forEach(function (reservationId, index) {
            var reservation = reservationModel.getReservation(reservationId);
            promises.push(new Promise(function (resolve, reject) {
                _this.logger.debug('updating reservation status to STATUS_WAITING_SETTLEMENT..._id:', reservationId);
                Models_1.default.Reservation.update({
                    _id: reservationId,
                    status: ReservationUtil_1.default.STATUS_TEMPORARY
                }, {
                    status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
                    updated_user: _this.constructor.toString(),
                }, function (err, affectedRows) {
                    _this.logger.info('STATUS_TEMPORARY to STATUS_WAITING_SETTLEMENT processed.', err, affectedRows);
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
        Promise.all(promises).then(function () {
            _this.logger.info('redirecting to waitingSettlement...');
            if (reservationModel.member) {
                _this.res.redirect(_this.router.build('member.reserve.waitingSettlement', { token: reservationModel.token }));
            }
            else {
                _this.res.redirect(_this.router.build('customer.reserve.waitingSettlement', { token: reservationModel.token }));
            }
        }, function (err) {
            // TODO どうする？
            _this.next(err);
        });
    };
    /**
     * GMO結果通知受信
     */
    GMOReserveCvsController.prototype.notify = function (reservationModel, gmoNotificationModel) {
        var _this = this;
        var promises = [];
        switch (gmoNotificationModel.Status) {
            case GMOUtil_1.default.STATUS_CVS_PAYSUCCESS:
                // 決済待ちの予約を予約完了へ
                // 予約情報セッション削除
                // これ以降、予約情報はローカルに引き回す
                this.logger.info('removing reservationModel... ', reservationModel.toLog());
                reservationModel.remove(function (err) {
                    if (err) {
                    }
                    else {
                        // TODO GMOからポストされたパラメータを予約情報に追加する
                        // 予約確定
                        _this.logger.info('fixing all... ');
                        _this.processFixAll(reservationModel, function (err, reservationModel) {
                            if (err) {
                                // TODO 万が一の対応どうするか
                                _this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                            }
                            else {
                                // TODO 予約できていない在庫があった場合
                                if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                    _this.logger.error('sending response RecvRes_NG... ');
                                    _this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                                }
                                else {
                                    // 完了
                                    _this.logger.info('sending response RecvRes_OK... ');
                                    _this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                                }
                            }
                        });
                    }
                });
                break;
            case GMOUtil_1.default.STATUS_CVS_REQSUCCESS:
                // 決済待ちステータスへ変更
                reservationModel.reservationIds.forEach(function (reservationId, index) {
                    var reservation = reservationModel.getReservation(reservationId);
                    promises.push(new Promise(function (resolve, reject) {
                        _this.logger.debug('updating reservation status to STATUS_WAITING_SETTLEMENT..._id:', reservationId);
                        Models_1.default.Reservation.update({
                            _id: reservationId,
                            status: ReservationUtil_1.default.STATUS_TEMPORARY
                        }, {
                            status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
                            updated_user: _this.constructor.toString(),
                        }, function (err, affectedRows) {
                            _this.logger.info('STATUS_TEMPORARY to STATUS_WAITING_SETTLEMENT processed.', err, affectedRows);
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
                Promise.all(promises).then(function () {
                    _this.logger.info('sending response RecvRes_OK... ');
                    _this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                }, function (err) {
                    // TODO どうする？
                    _this.logger.info('sending response RecvRes_NG... ');
                    _this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                });
                break;
            case GMOUtil_1.default.STATUS_CVS_UNPROCESSED:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                break;
            case GMOUtil_1.default.STATUS_CVS_PAYFAIL: // 決済失敗
            case GMOUtil_1.default.STATUS_CVS_EXPIRED: // 期限切れ
            case GMOUtil_1.default.STATUS_CVS_CANCEL:
                this.logger.debug('removing reservationModel... ');
                reservationModel.remove(function (err) {
                    if (err) {
                    }
                    else {
                        // 空席に戻す
                        reservationModel.reservationIds.forEach(function (reservationId, index) {
                            var reservation = reservationModel.getReservation(reservationId);
                            promises.push(new Promise(function (resolve, reject) {
                                _this.logger.debug('updating reservation status to STATUS_AVAILABLE..._id:', reservationId);
                                Models_1.default.Reservation.update({
                                    _id: reservationId
                                }, {
                                    status: ReservationUtil_1.default.STATUS_AVAILABLE,
                                    updated_user: _this.constructor.toString()
                                }, function (err, affectedRows) {
                                    _this.logger.info('STATUS_WAITING_SETTLEMENT to STATUS_AVAILABLE processed.', err, affectedRows);
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
                        Promise.all(promises).then(function () {
                            _this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                        }, function (err) {
                            // TODO どうする？
                            _this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                        });
                        _this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                });
                break;
            default:
                this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                break;
        }
    };
    return GMOReserveCvsController;
}(ReserveBaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCvsController;
