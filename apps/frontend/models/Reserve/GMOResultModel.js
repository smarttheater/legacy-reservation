"use strict";
/**
 * GMO決済結果モデル
 */
var GMOResultModel = (function () {
    function GMOResultModel() {
    }
    GMOResultModel.parse = function (postParameters) {
        var model = new GMOResultModel();
        for (var propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }
        return model;
    };
    return GMOResultModel;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOResultModel;
