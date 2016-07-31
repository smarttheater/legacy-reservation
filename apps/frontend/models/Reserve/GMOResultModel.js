"use strict";
/**
 * GMO決済結果モデル
 */
class GMOResultModel {
    static parse(postParameters) {
        let model = new GMOResultModel();
        for (let propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }
        return model;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOResultModel;
