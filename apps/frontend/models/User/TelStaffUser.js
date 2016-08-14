"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * 電話窓口ユーザークラス
 */
class TelStaffUser extends BaseUser_1.default {
    static getInstance() {
        if (TelStaffUser.instance === undefined) {
            TelStaffUser.instance = new TelStaffUser();
        }
        return TelStaffUser.instance;
    }
    static deleteInstance() {
        delete TelStaffUser.instance;
    }
    initialize(session) {
        let sessionName = TelStaffUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
TelStaffUser.AUTH_SESSION_NAME = 'TIFFFrontendTelStaffAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelStaffUser;
