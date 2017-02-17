import BaseUser from './BaseUser';

/**
 * 内部関係者ユーザークラス
 */
export default class StaffUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TTTSFrontendStaffAuth';

    // tslint:disable-next-line:function-name
    public static parse(session: Express.Session): StaffUser {
        const user = new StaffUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(StaffUser.AUTH_SESSION_NAME)) {
            Object.keys(session[StaffUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                (<any>user)[propertyName] = session[StaffUser.AUTH_SESSION_NAME][propertyName];
            });
        }

        return user;
    }
}
