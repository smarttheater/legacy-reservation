"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * 窓口ユーザークラス
 */
class WindowUser extends BaseUser_1.default {
    static getInstance() {
        if (WindowUser.instance === undefined) {
            WindowUser.instance = new WindowUser();
        }
        return WindowUser.instance;
    }
    static deleteInstance() {
        delete WindowUser.instance;
    }
    initialize(session) {
        let sessionName = WindowUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
WindowUser.AUTH_SESSION_NAME = 'TIFFFrontendWindowAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WindowUser;
