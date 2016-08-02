"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * ムビチケユーザークラス
 */
class MvtkUser extends BaseUser_1.default {
    static getInstance() {
        if (MvtkUser.instance === undefined) {
            MvtkUser.instance = new MvtkUser();
        }
        return MvtkUser.instance;
    }
    static deleteInstance() {
        delete MvtkUser.instance;
    }
    initialize(session) {
        let sessionName = MvtkUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
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
