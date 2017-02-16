"use strict";
const BaseUser_1 = require("./BaseUser");
/**
 * 窓口ユーザークラス
 */
class WindowUser extends BaseUser_1.default {
    // tslint:disable-next-line:function-name
    static parse(session) {
        const user = new WindowUser();
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(WindowUser.AUTH_SESSION_NAME)) {
            Object.keys(session[WindowUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[WindowUser.AUTH_SESSION_NAME][propertyName];
            });
        }
        return user;
    }
}
WindowUser.AUTH_SESSION_NAME = 'TTTSFrontendWindowAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WindowUser;
