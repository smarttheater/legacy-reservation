"use strict";
const BaseUser_1 = require("./BaseUser");
/**
 * メルマガ会員ユーザークラス
 */
class MemberUser extends BaseUser_1.default {
    static parse(session) {
        let user = new MemberUser();
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(MemberUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[MemberUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[MemberUser.AUTH_SESSION_NAME][propertyName];
            }
        }
        return user;
    }
}
MemberUser.AUTH_SESSION_NAME = 'TTTSFrontendMemberAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberUser;
