"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * ムビチケユーザークラス
 */
class MvtkUser extends BaseUser_1.default {
    static parse(session) {
        let user = new MvtkUser();
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(MvtkUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[MvtkUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[MvtkUser.AUTH_SESSION_NAME][propertyName];
            }
        }
        return user;
    }
    /**
     * サインイン中かどうか
     */
    isAuthenticated() {
        return (this.memberInfoResult !== undefined);
    }
}
MvtkUser.AUTH_SESSION_NAME = 'TIFFFrontendMvtkAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MvtkUser;
