"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseUser_1 = require("./BaseUser");
/**
 * 先行予約ユーザー
 *
 * @export
 * @class PreCustomerUser
 * @extends {BaseUser}
 */
class PreCustomerUser extends BaseUser_1.default {
    // tslint:disable-next-line:function-name
    static parse(session) {
        const user = new PreCustomerUser();
        // セッション値からオブジェクトにセット
        if (session !== undefined && session.hasOwnProperty(PreCustomerUser.AUTH_SESSION_NAME)) {
            Object.keys(session[PreCustomerUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[PreCustomerUser.AUTH_SESSION_NAME][propertyName];
            });
        }
        return user;
    }
}
PreCustomerUser.AUTH_SESSION_NAME = 'CHEVREFrontendPreCustomerAuth';
exports.default = PreCustomerUser;
