import BaseUser from './BaseUser';

/**
 * メルマガ会員ユーザークラス
 */
export default class MemberUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TIFFFrontendMemberAuth';

    public static parse(session: Express.Session): MemberUser {
        let user = new MemberUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(MemberUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[MemberUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[MemberUser.AUTH_SESSION_NAME][propertyName];
            }
        }

        return user;
    }
}
