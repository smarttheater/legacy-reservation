import session = require('express-session');
import BaseUser from './BaseUser';

/**
 * 外部関係者ユーザークラス
 */
export default class SponsorUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TIFFFrontendSponsorAuth';

    public static parse(session: Express.Session): SponsorUser {
        let user = new SponsorUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(SponsorUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[SponsorUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[SponsorUser.AUTH_SESSION_NAME][propertyName];
            }
        }

        return user;
    }

    /** 購入フロー中のプロフィール */
    public profile: {
        last_name: string,
        first_name: string,
        tel: string,
        email: string
    };
}
