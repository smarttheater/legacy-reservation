import BaseUser from './BaseUser';

/**
 * 内部関係者ユーザークラス
 */
export default class StaffUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TTTSFrontendStaffAuth';

    public static parse(session: Express.Session): StaffUser {
        let user = new StaffUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(StaffUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[StaffUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[StaffUser.AUTH_SESSION_NAME][propertyName];
            }
        }

        return user;
    }
}
