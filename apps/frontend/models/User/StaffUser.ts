import session = require('express-session');
import BaseUser from './BaseUser';

/**
 * 内部関係者ユーザークラス
 */
export default class StaffUser extends BaseUser {
    private static instance;

    public static getInstance(): StaffUser {
        if (StaffUser.instance === undefined) {
            StaffUser.instance = new StaffUser();
        }

        return StaffUser.instance;
    }

    public static deleteInstance(): void {
        delete StaffUser.instance;
    }

    public static AUTH_SESSION_NAME = 'TIFFFrontendStaffAuth';

    public initialize(session: Express.Session): void {
        let sessionName = StaffUser.AUTH_SESSION_NAME;

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
