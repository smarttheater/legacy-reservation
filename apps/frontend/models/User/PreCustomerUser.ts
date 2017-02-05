import BaseUser from './BaseUser';

/**
 * 1.5次販売ユーザークラス
 */
export default class PreCustomerUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TTTSFrontendPreCustomerAuth';

    public static parse(session: Express.Session): PreCustomerUser {
        let user = new PreCustomerUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(PreCustomerUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[PreCustomerUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[PreCustomerUser.AUTH_SESSION_NAME][propertyName];
            }
        }

        return user;
    }
}
