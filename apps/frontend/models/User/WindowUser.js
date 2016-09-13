"use strict";
const BaseUser_1 = require("./BaseUser");
/**
 * 窓口ユーザークラス
 */
class WindowUser extends BaseUser_1.default {
    static parse(session) {
        let user = new WindowUser();
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(WindowUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[WindowUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[WindowUser.AUTH_SESSION_NAME][propertyName];
            }
        }
        return user;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 窓口ユーザークラス
 */
exports.default = WindowUser;
WindowUser.AUTH_SESSION_NAME = 'TIFFFrontendWindowAuth';
