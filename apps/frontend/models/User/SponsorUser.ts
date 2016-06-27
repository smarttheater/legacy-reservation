import session = require('express-session');

/**
 * 外部関係者ユーザークラス
 */
export default class SponsorUser {
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

    public initialize(session: Express.Session, cb: () => any): void {
        let sessionName = SponsorUser.AUTH_SESSION_NAME;

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }

        cb();
    }

    /**
     * サインイン中かどうか
     */
    public isAuthenticated(): boolean {
        return (this.get('_id') !== null);
    }

    public get(key: string): any {
        return (this[key]) ? this[key] : null;
    }
}
