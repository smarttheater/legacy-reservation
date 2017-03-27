import BaseUser from './BaseUser';

/**
 * 先行予約ユーザー
 *
 * @export
 * @class PreCustomerUser
 * @extends {BaseUser}
 */
export default class PreCustomerUser extends BaseUser {
    public static AUTH_SESSION_NAME: string = 'CHEVREFrontendPreCustomerAuth';

    // tslint:disable-next-line:function-name
    public static parse(session: Express.Session | undefined): PreCustomerUser {
        const user = new PreCustomerUser();

        // セッション値からオブジェクトにセット
        if (session !== undefined && session.hasOwnProperty(PreCustomerUser.AUTH_SESSION_NAME)) {
            Object.keys(session[PreCustomerUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                (<any>user)[propertyName] = session[PreCustomerUser.AUTH_SESSION_NAME][propertyName];
            });
        }

        return user;
    }
}
