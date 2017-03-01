"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:variable-name
/**
 * GMOコンビニ決済結果通知モデル
 *
 * @export
 * @class GMONotificationModel
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
exports.default = GMONotificationModel;
