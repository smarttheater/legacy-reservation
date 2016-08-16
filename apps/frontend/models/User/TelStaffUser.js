"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * 電話窓口ユーザークラス
 */
class TelStaffUser extends BaseUser_1.default {
    static parse(session) {
        let user = new TelStaffUser();
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(TelStaffUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[TelStaffUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[TelStaffUser.AUTH_SESSION_NAME][propertyName];
            }
        }
        return user;
    }
}
TelStaffUser.AUTH_SESSION_NAME = 'TIFFFrontendTelStaffAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelStaffUser;
