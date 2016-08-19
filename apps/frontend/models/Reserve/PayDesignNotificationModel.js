"use strict";
/**
 * ペイデザイン入金モデル
 */
class PayDesignNotificationModel {
    static parse(postParameters) {
        let model = new PayDesignNotificationModel();
        for (let propertyName in postParameters) {
            model[propertyName] = postParameters[propertyName];
        }
        return model;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayDesignNotificationModel;
