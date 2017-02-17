"use strict";
const BaseUser_1 = require("./BaseUser");
/**
 * 内部関係者ユーザー
 *
 * @export
 * @class StaffUser
 * @extends {BaseUser}
 */
class StaffUser extends BaseUser_1.default {
    // tslint:disable-next-line:function-name
    static parse(session) {
        const user = new StaffUser();
        // セッション値からオブジェクトにセット
        if (session && session.hasOwnProperty(StaffUser.AUTH_SESSION_NAME)) {
            Object.keys(session[StaffUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[StaffUser.AUTH_SESSION_NAME][propertyName];
            });
        }
        return user;
    }
}
StaffUser.AUTH_SESSION_NAME = 'TTTSFrontendStaffAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffUser;
