import session = require('express-session');

/**
 * ベースユーザークラス
 */
export default class BaseUser {
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
