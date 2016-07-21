"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ReserveBaseController_1 = require('../../../ReserveBaseController');
var GMOUtil_1 = require('../../../../../common/Util/GMO/GMOUtil');
var GMONotificationResponseModel_1 = require('../../../../models/Reserve/GMONotificationResponseModel');
var GMOReserveCreditController = (function (_super) {
    __extends(GMOReserveCreditController, _super);
    function GMOReserveCreditController() {
        _super.apply(this, arguments);
    }
    /**
     * GMOからの結果受信
     */
    GMOReserveCreditController.prototype.result = function (reservationModel, gmoResultModel) {
        // TODO バッチ処理側で予約完了処理をするとすると、ここでは完了ページにいきなり遷移してもいいかもしれない
        // バッチ処理が遅ければ、決済中です...みたいな表記とか
        var _this = this;
        // 予約情報セッション削除
        // これ以降、予約情報はローカルに引き回す
        this.logger.info('removing reservationModel... ');
        reservationModel.remove(function (err) {
            if (err) {
            }
            else {
                // TODO GMOからポストされたパラメータを予約情報に追加する
                // 予約確定
                _this.processFixAll(reservationModel, function (err, reservationModel) {
                    if (err) {
                        // TODO 万が一の対応どうするか
                        _this.next(err);
                    }
                    else {
                        // TODO 予約できていない在庫があった場合
                        if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                            _this.next(new Error('決済を完了できませんでした'));
                        }
                        else {
                            // 予約結果セッションを保存して、完了画面へ
                            var reservationResultModel = reservationModel.toReservationResult();
                            _this.logger.info('saving reservationResult...', reservationResultModel.toLog());
                            reservationResultModel.save(function (err) {
                                _this.logger.info('redirecting to complete...');
                                if (reservationModel.member) {
                                    _this.res.redirect(_this.router.build('member.reserve.complete', { token: reservationModel.token }));
                                }
                                else {
                                    _this.res.redirect(_this.router.build('customer.reserve.complete', { token: reservationModel.token }));
                                }
                            });
                        }
                    }
                });
            }
        });
    };
    /**
     * GMO結果通知受信
     */
    GMOReserveCreditController.prototype.notify = function (reservationModel, gmoNotificationModel) {
        var _this = this;
        switch (gmoNotificationModel.Status) {
            case GMOUtil_1.default.STATUS_CREDIT_CAPTURE:
                // 予約情報セッション削除
                // これ以降、予約情報はローカルに引き回す
                // TODO バッチで消してしまうと、ブラウザで完了ページを表示できない(仕様検討)
                // this.logger.info('removing reservationModel... ');
                // reservationModel.remove((err) => {
                //     if (err) {
                //     } else {
                // TODO GMOからポストされたパラメータを予約情報に追加する
                // 予約確定
                this.processFixAll(reservationModel, function (err, reservationModel) {
                    if (err) {
                        // TODO 万が一の対応どうするか
                        _this.logger.info('sending response RecvRes_NG...', err);
                        _this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                    }
                    else {
                        // TODO 予約できていない在庫があった場合
                        if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                            _this.logger.info('sending response RecvRes_NG...');
                            _this.res.send(GMONotificationResponseModel_1.default.RecvRes_NG);
                        }
                        else {
                            _this.logger.info('sending response RecvRes_OK...');
                            _this.res.send(GMONotificationResponseModel_1.default.RecvRes_OK);
                        }
                    }
                });
                //     }
                // });
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
    };
    return GMOReserveCreditController;
}(ReserveBaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOReserveCreditController;
