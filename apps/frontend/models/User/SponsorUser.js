"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseUser_1 = require('./BaseUser');
/**
 * 外部関係者ユーザークラス
 */
var SponsorUser = (function (_super) {
    __extends(SponsorUser, _super);
    function SponsorUser() {
        _super.apply(this, arguments);
    }
    SponsorUser.getInstance = function () {
        if (SponsorUser.instance === undefined) {
            SponsorUser.instance = new SponsorUser();
        }
        return SponsorUser.instance;
    };
    SponsorUser.deleteInstance = function () {
        delete SponsorUser.instance;
    };
    SponsorUser.prototype.initialize = function (session) {
        var sessionName = SponsorUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (var propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    };
    SponsorUser.AUTH_SESSION_NAME = 'TIFFFrontendSponsorAuth';
    return SponsorUser;
}(BaseUser_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorUser;
