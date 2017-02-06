import BaseUser from './BaseUser';

/**
 * 電話窓口ユーザークラス
 */
export default class TelStaffUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TTTSFrontendTelStaffAuth';

    public static parse(session: Express.Session): TelStaffUser {
        let user = new TelStaffUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(TelStaffUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[TelStaffUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[TelStaffUser.AUTH_SESSION_NAME][propertyName];
            }
        }

        return user;
    }
}
