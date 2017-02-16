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

    // tslint:disable-next-line:no-reserved-keywords
    public get(key: string): any {
        return (this[key]) ? this[key] : null;
    }
}
