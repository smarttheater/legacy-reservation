"use strict";
const BaseUser_1 = require("./BaseUser");
/**
 * 内部関係者ユーザークラス
 */
class StaffUser extends BaseUser_1.default {
    static parse(session) {
        let user = new StaffUser();
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(StaffUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[StaffUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[StaffUser.AUTH_SESSION_NAME][propertyName];
            }
        }
        return user;
    }
}
StaffUser.AUTH_SESSION_NAME = 'TTTSFrontendStaffAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffUser;
