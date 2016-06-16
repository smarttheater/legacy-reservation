import session = require('express-session');

/**
 * ユーザークラス
 * 
 * ムビチケ会員認証をセッションで管理するためのクラスです
 */
export default class User {
    private static instance;

    public static getInstance(): User {
        if (User.instance === undefined) {
            User.instance = new User();
        }

        return User.instance;
    }

    public static deleteInstance(): void {
        delete User.instance;
    }

    public authSessionName = 'MWSFrontendAuth';

    /**
     * 会員コード
     */
    public kiinCd: string;

    /**
     * ムビチケサービスに送信するクッキー文字列
     */
    public cookie: string;

    public initialize(session: Express.Session, cb: () => any): void {
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(this.authSessionName)) {
            for (let propertyName in session[this.authSessionName]) {
                this[propertyName] = session[this.authSessionName][propertyName];
            }
        }

        cb();
    }

    /**
     * サインイン中かどうか
     */
    public isAuthenticated(): boolean {
        return (this.cookie !== undefined);
    }

    public getKiinCd(): string {
        return this.kiinCd;
    }

    public getCookie(): string {
        return this.cookie;
    }
}
