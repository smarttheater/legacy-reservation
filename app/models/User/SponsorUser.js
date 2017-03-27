"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseUser_1 = require("./BaseUser");
/**
 * 外部関係者ユーザー
 *
 * @export
 * @class SponsorUser
 * @extends {BaseUser}
 */
class SponsorUser extends BaseUser_1.default {
    // tslint:disable-next-line:function-name
    static parse(session) {
        const user = new SponsorUser();
        // セッション値からオブジェクトにセット
        if (session !== undefined && session.hasOwnProperty(SponsorUser.AUTH_SESSION_NAME)) {
            Object.keys(session[SponsorUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[SponsorUser.AUTH_SESSION_NAME][propertyName];
            });
        }
        return user;
    }
}
SponsorUser.AUTH_SESSION_NAME = 'CHEVREFrontendSponsorAuth';
exports.default = SponsorUser;
