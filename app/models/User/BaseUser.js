"use strict";
/**
 * ベースユーザークラス
 */
class BaseUser {
    /**
     * サインイン中かどうか
     */
    isAuthenticated() {
        return (this.get('_id') !== null);
    }
    // tslint:disable-next-line:no-reserved-keywords
    get(key) {
        return (this[key]) ? this[key] : null;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseUser;
