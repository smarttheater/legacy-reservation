import session = require('express-session');
import BaseUser from './BaseUser';
import mvtkService = require('@motionpicture/mvtk-service');

/**
 * ムビチケユーザークラス
 */
export default class MvtkUser extends BaseUser {
    public static AUTH_SESSION_NAME = 'TIFFFrontendMvtkAuth';

    public static parse(session: Express.Session): MvtkUser {
        let user = new MvtkUser();

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(MvtkUser.AUTH_SESSION_NAME)) {
            for (let propertyName in session[MvtkUser.AUTH_SESSION_NAME]) {
                user[propertyName] = session[MvtkUser.AUTH_SESSION_NAME][propertyName];
            }
        }

        return user;
    }

    /**
     * 会員情報詳細
     */
    public memberInfoResult: mvtkService.services.MemberInfo.models.MemberInfoResult;

    /**
     * サインイン中かどうか
     */
    public isAuthenticated(): boolean {
        return (this.memberInfoResult !== undefined);
    }
}
