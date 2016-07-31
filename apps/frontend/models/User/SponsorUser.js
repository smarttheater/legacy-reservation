"use strict";
const BaseUser_1 = require('./BaseUser');
/**
 * 外部関係者ユーザークラス
 */
class SponsorUser extends BaseUser_1.default {
    static getInstance() {
        if (SponsorUser.instance === undefined) {
            SponsorUser.instance = new SponsorUser();
        }
        return SponsorUser.instance;
    }
    static deleteInstance() {
        delete SponsorUser.instance;
    }
    initialize(session) {
        let sessionName = SponsorUser.AUTH_SESSION_NAME;
        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }
}
SponsorUser.AUTH_SESSION_NAME = 'TIFFFrontendSponsorAuth';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorUser;
