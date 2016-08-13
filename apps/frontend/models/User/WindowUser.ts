import session = require('express-session');
import BaseUser from './BaseUser';

/**
 * 窓口ユーザークラス
 */
export default class WindowUser extends BaseUser {
    private static instance;

    public static getInstance(): WindowUser {
        if (WindowUser.instance === undefined) {
            WindowUser.instance = new WindowUser();
        }

        return WindowUser.instance;
    }

    public static deleteInstance(): void {
        delete WindowUser.instance;
    }

    public static AUTH_SESSION_NAME = 'TIFFFrontendWindowAuth';

    public initialize(session: Express.Session): void {
        let sessionName = WindowUser.AUTH_SESSION_NAME;

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
