import BaseUser from './BaseUser';

/**
 * 外部関係者ユーザー
 *
 * @export
 * @class SponsorUser
 * @extends {BaseUser}
 */
export default class SponsorUser extends BaseUser {
    public static AUTH_SESSION_NAME: string = 'CHEVREFrontendSponsorAuth';

    // tslint:disable-next-line:function-name
    public static parse(session: Express.Session | undefined): SponsorUser {
        const user = new SponsorUser();

        // セッション値からオブジェクトにセット
        if (session !== undefined && session.hasOwnProperty(SponsorUser.AUTH_SESSION_NAME)) {
            Object.keys(session[SponsorUser.AUTH_SESSION_NAME]).forEach((propertyName) => {
                (<any>user)[propertyName] = session[SponsorUser.AUTH_SESSION_NAME][propertyName];
            });
        }

        return user;
    }
}