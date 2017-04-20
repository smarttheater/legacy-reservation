"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseUser_1 = require("./BaseUser");
/**
 * 電話窓口ユーザー
 *
 * @export
 * @class TelStaffUser
 * @extends {BaseUser}
 */
class TelStaffUser extends BaseUser_1.default {
    // tslint:disable-next-line:function-name
    static parse(session) {
        const user = new TelStaffUser();
        // セッション値からオブジェクトにセット
        if (session !== undefined && session.hasOwnProperty(TelStaffUser.AUTH_SESSION_NAME)) {
            Object.keys(session[TelStaffUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[TelStaffUser.AUTH_SESSION_NAME][propertyName];
            });
        }
        return user;
    }
}
TelStaffUser.AUTH_SESSION_NAME = 'CHEVREFrontendTelStaffAuth';
exports.default = TelStaffUser;