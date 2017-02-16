import BaseUser from './BaseUser';

/**
 * 窓口ユーザークラス
 */
export default class WindowUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TTTSFrontendWindowAuth';

    // tslint:disable-next-line:function-name
    public static parse(session: Express.Session): WindowUser {
        const user = new WindowUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(WindowUser.AUTH_SESSION_NAME)) {
            Object.keys(session[WindowUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                user[propertyName] = session[WindowUser.AUTH_SESSION_NAME][propertyName];
            });
        }

        return user;
    }
}
