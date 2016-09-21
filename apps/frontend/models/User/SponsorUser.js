"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * 外部関係者ユーザークラス
 */
class SponsorUser extends BaseUser_1.default {
    static parse(session) {
        let user = new SponsorUser();
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(SponsorUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[SponsorUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[SponsorUser.AUTH_SESSION_NAME][propertyName];
            }
        }
        return user;
    }
}
SponsorUser.AUTH_SESSION_NAME = 'TIFFFrontendSponsorAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorUser;
