import session = require('express-session');
import BaseUser from './BaseUser';

/**
 * 外部関係者ユーザークラス
 */
export default class SponsorUser extends BaseUser {
    private static instance;

    public static getInstance(): SponsorUser {
        if (SponsorUser.instance === undefined) {
            SponsorUser.instance = new SponsorUser();
        }

        return SponsorUser.instance;
    }

    public static deleteInstance(): void {
        delete SponsorUser.instance;
    }

    public static AUTH_SESSION_NAME = 'TIFFFrontendSponsorAuth';

    public initialize(session: Express.Session): void {
        let sessionName = SponsorUser.AUTH_SESSION_NAME;

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
