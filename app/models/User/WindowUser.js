"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseUser_1 = require("./BaseUser");
/**
 * 当日窓口ユーザー
 *
 * @export
 * @class WindowUser
 * @extends {BaseUser}
 */
class WindowUser extends BaseUser_1.default {
    // tslint:disable-next-line:function-name
    static parse(session) {
        const user = new WindowUser();
        // セッション値からオブジェクトにセット
        if (session && session.hasOwnProperty(WindowUser.AUTH_SESSION_NAME)) {
            Object.keys(session[WindowUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[WindowUser.AUTH_SESSION_NAME][propertyName];
            });
        }
        return user;
    }
}
WindowUser.AUTH_SESSION_NAME = 'CHEVREFrontendWindowAuth';
exports.default = WindowUser;
