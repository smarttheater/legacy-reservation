"use strict";
const BaseUser_1 = require("./BaseUser");
/**
 * 1.5次販売ユーザークラス
 */
class PreCustomerUser extends BaseUser_1.default {
    static parse(session) {
        let user = new PreCustomerUser();
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(PreCustomerUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[PreCustomerUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[PreCustomerUser.AUTH_SESSION_NAME][propertyName];
            }
        }
        return user;
    }
}
PreCustomerUser.AUTH_SESSION_NAME = 'TTTSFrontendPreCustomerAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreCustomerUser;
