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
    get(key) {
        return (this[key]) ? this[key] : null;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ベースユーザークラス
 */
exports.default = BaseUser;
