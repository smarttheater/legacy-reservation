"use strict";
/**
 * ベースユーザークラス
 */
var BaseUser = (function () {
    function BaseUser() {
    }
    /**
     * サインイン中かどうか
     */
    BaseUser.prototype.isAuthenticated = function () {
        return (this.get('_id') !== null);
    };
    BaseUser.prototype.get = function (key) {
        return (this[key]) ? this[key] : null;
    };
    return BaseUser;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseUser;
