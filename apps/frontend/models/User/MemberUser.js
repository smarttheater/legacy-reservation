"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * メルマガ会員ユーザークラス
 */
class MemberUser extends BaseUser_1.default {
    static getInstance() {
        if (MemberUser.instance === undefined) {
            MemberUser.instance = new MemberUser();
        }
        return MemberUser.instance;
    }
    static deleteInstance() {
        delete MemberUser.instance;
    }
    initialize(session) {
        let sessionName = MemberUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
MemberUser.AUTH_SESSION_NAME = 'TIFFFrontendMemberAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberUser;
