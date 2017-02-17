import BaseUser from './BaseUser';

/**
 * 1.5次販売ユーザークラス
 */
export default class PreCustomerUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TTTSFrontendPreCustomerAuth';

    // tslint:disable-next-line:function-name
    public static parse(session: Express.Session): PreCustomerUser {
        const user = new PreCustomerUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(PreCustomerUser.AUTH_SESSION_NAME)) {
            Object.keys(session[PreCustomerUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                (<any>user)[propertyName] = session[PreCustomerUser.AUTH_SESSION_NAME][propertyName];
            });
        }

        return user;
    }
}
