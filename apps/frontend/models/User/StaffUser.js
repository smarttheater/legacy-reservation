"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseUser_1 = require('./BaseUser');
/**
 * 内部関係者ユーザークラス
 */
var StaffUser = (function (_super) {
    __extends(StaffUser, _super);
    function StaffUser() {
        _super.apply(this, arguments);
    }
    StaffUser.getInstance = function () {
        if (StaffUser.instance === undefined) {
            StaffUser.instance = new StaffUser();
        }
        return StaffUser.instance;
    };
    StaffUser.deleteInstance = function () {
        delete StaffUser.instance;
    };
    StaffUser.prototype.initialize = function (session) {
        var sessionName = StaffUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (var propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    };
    StaffUser.AUTH_SESSION_NAME = 'TIFFFrontendStaffAuth';
    return StaffUser;
}(BaseUser_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffUser;
