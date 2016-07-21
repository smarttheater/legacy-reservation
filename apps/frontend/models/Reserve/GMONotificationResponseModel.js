"use strict";
/**
 * GMOコンビニ決済結果通知に対する返却モデル(加盟店様⇒本サービス)
 */
var GMONotificationResponseModel = (function () {
    function GMONotificationResponseModel() {
    }
    GMONotificationResponseModel.RecvRes_OK = '0';
    GMONotificationResponseModel.RecvRes_NG = '1';
    return GMONotificationResponseModel;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMONotificationResponseModel;
