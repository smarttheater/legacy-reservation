"use strict";
/**
 * GMOコンビニ決済結果通知モデル
 */
var GMONotificationModel = (function () {
    function GMONotificationModel() {
    }
    GMONotificationModel.parse = function (postParameters) {
        var model = new GMONotificationModel();
        for (var propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }
        return model;
    };
    return GMONotificationModel;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMONotificationModel;
