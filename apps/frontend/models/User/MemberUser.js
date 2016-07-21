"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseUser_1 = require('./BaseUser');
/**
 * メルマガ会員ユーザークラス
 */
var MemberUser = (function (_super) {
    __extends(MemberUser, _super);
    function MemberUser() {
        _super.apply(this, arguments);
    }
    MemberUser.getInstance = function () {
        if (MemberUser.instance === undefined) {
            MemberUser.instance = new MemberUser();
        }
        return MemberUser.instance;
    };
    MemberUser.deleteInstance = function () {
        delete MemberUser.instance;
    };
    MemberUser.prototype.initialize = function (session) {
        var sessionName = MemberUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (var propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    };
    MemberUser.AUTH_SESSION_NAME = 'TIFFFrontendMemberAuth';
    return MemberUser;
}(BaseUser_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberUser;
