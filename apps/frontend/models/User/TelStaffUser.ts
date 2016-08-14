import session = require('express-session');
import BaseUser from './BaseUser';

/**
 * 電話窓口ユーザークラス
 */
export default class TelStaffUser extends BaseUser {
    private static instance;

    public static getInstance(): TelStaffUser {
        if (TelStaffUser.instance === undefined) {
            TelStaffUser.instance = new TelStaffUser();
        }

        return TelStaffUser.instance;
    }

    public static deleteInstance(): void {
        delete TelStaffUser.instance;
    }

    public static AUTH_SESSION_NAME = 'TIFFFrontendTelStaffAuth';

    public initialize(session: Express.Session): void {
        let sessionName = TelStaffUser.AUTH_SESSION_NAME;

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
