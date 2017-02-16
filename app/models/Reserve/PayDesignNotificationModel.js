"use strict";
/**
 * ペイデザイン結果通知モデル
 */
class PayDesignNotificationModel {
    // tslint:disable-next-line:function-name
    static parse(postParameters) {
        const model = new PayDesignNotificationModel();
        Object.keys(postParameters).forEach((key) => {
            model[key] = postParameters[key];
        });
        return model;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayDesignNotificationModel;
