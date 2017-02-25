import BaseUser from './BaseUser';

/**
 * 電話窓口ユーザー
 *
 * @export
 * @class TelStaffUser
 * @extends {BaseUser}
 */
export default class TelStaffUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'CHEVREFrontendTelStaffAuth';

    // tslint:disable-next-line:function-name
    public static parse(session: Express.Session | undefined): TelStaffUser {
        const user = new TelStaffUser();

        // セッション値からオブジェクトにセット
        if (session && session.hasOwnProperty(TelStaffUser.AUTH_SESSION_NAME)) {
            Object.keys(session[TelStaffUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                (<any>user)[propertyName] = session[TelStaffUser.AUTH_SESSION_NAME][propertyName];
            });
        }

        return user;
    }
}
