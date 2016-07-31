"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * 内部関係者ユーザークラス
 */
class StaffUser extends BaseUser_1.default {
    static getInstance() {
        if (StaffUser.instance === undefined) {
            StaffUser.instance = new StaffUser();
        }
        return StaffUser.instance;
    }
    static deleteInstance() {
        delete StaffUser.instance;
    }
    initialize(session) {
        let sessionName = StaffUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
StaffUser.AUTH_SESSION_NAME = 'TIFFFrontendStaffAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffUser;
