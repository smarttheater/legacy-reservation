"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ペイデザイン結果通知モデル
 *
 * @export
 * @class PayDesignNotificationModel
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
exports.default = PayDesignNotificationModel;