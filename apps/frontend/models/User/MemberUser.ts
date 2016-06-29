import session = require('express-session');
import BaseUser from './BaseUser';

/**
 * メルマガ会員ユーザークラス
 */
export default class MemberUser extends BaseUser {
    private static instance;

    public static getInstance(): MemberUser {
        if (MemberUser.instance === undefined) {
            MemberUser.instance = new MemberUser();
        }

        return MemberUser.instance;
    }

    public static deleteInstance(): void {
        delete MemberUser.instance;
    }

    public static AUTH_SESSION_NAME = 'TIFFFrontendMemberAuth';

    public initialize(session: Express.Session): void {
        let sessionName = MemberUser.AUTH_SESSION_NAME;

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
