import BaseUser from './BaseUser';

/**
 * 窓口ユーザークラス
 */
export default class WindowUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TIFFFrontendWindowAuth';

    public static parse(session: Express.Session): WindowUser {
        let user = new WindowUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(WindowUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[WindowUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[WindowUser.AUTH_SESSION_NAME][propertyName];
            }
        }

        return user;
    }
}
