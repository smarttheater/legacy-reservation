"use strict";
/**
 * GMOコンビニ決済結果通知モデル
 */
class GMONotificationModel {
    static parse(postParameters) {
        let model = new GMONotificationModel();
        for (let propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }
        return model;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GMOコンビニ決済結果通知モデル
 */
exports.default = GMONotificationModel;
