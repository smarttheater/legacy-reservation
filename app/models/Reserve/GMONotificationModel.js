"use strict";
// tslint:disable:variable-name
/**
 * GMOコンビニ決済結果通知モデル
 */
class GMONotificationModel {
    // tslint:disable-next-line:function-name
    static parse(postParameters) {
        const model = new GMONotificationModel();
        Object.keys(postParameters).forEach((key) => {
            model[key] = postParameters[key];
        });
        return model;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMONotificationModel;
