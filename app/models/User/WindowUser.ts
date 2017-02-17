import BaseUser from './BaseUser';

/**
 * 当日窓口ユーザー
 *
 * @export
 * @class WindowUser
 * @extends {BaseUser}
 */
export default class WindowUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TTTSFrontendWindowAuth';

    // tslint:disable-next-line:function-name
    public static parse(session: Express.Session | undefined): WindowUser {
        const user = new WindowUser();

        // セッション値からオブジェクトにセット
        if (session && session.hasOwnProperty(WindowUser.AUTH_SESSION_NAME)) {
            Object.keys(session[WindowUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                (<any>user)[propertyName] = session[WindowUser.AUTH_SESSION_NAME][propertyName];
            });
        }

        return user;
    }
}
