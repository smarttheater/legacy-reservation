"use strict";
const BaseUser_1 = require("./BaseUser");
/**
 * 外部関係者ユーザークラス
 */
class SponsorUser extends BaseUser_1.default {
    // tslint:disable-next-line:function-name
    static parse(session) {
        const user = new SponsorUser();
        // セッション値からオブジェクトにセット
        if (session && session.hasOwnProperty(SponsorUser.AUTH_SESSION_NAME)) {
            Object.keys(session[SponsorUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[SponsorUser.AUTH_SESSION_NAME][propertyName];
            });
        }
        return user;
    }
}
SponsorUser.AUTH_SESSION_NAME = 'TTTSFrontendSponsorAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorUser;
