"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseUser_1 = require("./BaseUser");
/**
 * メルマガ会員ユーザー
 *
 * @export
 * @class MemberUser
 * @extends {BaseUser}
 */
class MemberUser extends BaseUser_1.default {
    // tslint:disable-next-line:function-name
    static parse(session) {
        const user = new MemberUser();
        // セッション値からオブジェクトにセット
        if (session !== undefined && session.hasOwnProperty(MemberUser.AUTH_SESSION_NAME)) {
            Object.keys(session[MemberUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[MemberUser.AUTH_SESSION_NAME][propertyName];
            });
        }
        return user;
    }
}
MemberUser.AUTH_SESSION_NAME = 'CHEVREFrontendMemberAuth';
exports.default = MemberUser;