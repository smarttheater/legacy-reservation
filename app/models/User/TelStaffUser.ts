import BaseUser from './BaseUser';

/**
 * 電話窓口ユーザークラス
 */
export default class TelStaffUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TTTSFrontendTelStaffAuth';

    // tslint:disable-next-line:function-name
    public static parse(session: Express.Session): TelStaffUser {
        const user = new TelStaffUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(TelStaffUser.AUTH_SESSION_NAME)) {
            Object.keys(session[TelStaffUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[TelStaffUser.AUTH_SESSION_NAME][propertyName];
            });
        }

        return user;
    }
}
