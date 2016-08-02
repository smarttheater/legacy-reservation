import session = require('express-session');
import BaseUser from './BaseUser';
import mvtkService = require('@motionpicture/mvtk-service');

/**
 * ムビチケユーザークラス
 */
export default class MvtkUser extends BaseUser {
    private static instance;

    public static getInstance(): MvtkUser {
        if (MvtkUser.instance === undefined) {
            MvtkUser.instance = new MvtkUser();
        }

        return MvtkUser.instance;
    }

    public static deleteInstance(): void {
        delete MvtkUser.instance;
    }

    public static AUTH_SESSION_NAME = 'TIFFFrontendMvtkAuth';

    /**
     * 会員情報詳細
     */
    public memberInfoResult: mvtkService.services.MemberInfo.models.MemberInfoResult;

    public initialize(session: Express.Session): void {
        let sessionName = MvtkUser.AUTH_SESSION_NAME;

        // セッション値からオブジェクトにセット
        if (session.hasOwnProperty(sessionName)) {
            for (let propertyName in session[sessionName]) {
                this[propertyName] = session[sessionName][propertyName];
            }
        }
    }

    /**
     * サインイン中かどうか
     */
    public isAuthenticated(): boolean {
        return (this.memberInfoResult !== undefined);
    }
}
