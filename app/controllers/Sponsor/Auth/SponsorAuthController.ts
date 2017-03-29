import { Models } from '@motionpicture/chevre-domain';
import * as _ from 'underscore';

import * as Util from '../../../../common/Util/Util';
import sponsorLoginForm from '../../../forms/sponsor/sponsorLoginForm';
import SponsorUser from '../../../models/User/SponsorUser';
import BaseController from '../../BaseController';

/**
 * 外部関係者認証コントローラー
 *
 * @export
 * @class SponsorAuthController
 * @extends {BaseController}
 */
export default class SponsorAuthController extends BaseController {
    public layout: string = 'layouts/sponsor/layout';

    /**
     * sponsor login
     */
    public login(): void {
        if (this.req.sponsorUser !== undefined && this.req.sponsorUser.isAuthenticated()) {
            this.res.redirect(this.router.build('sponsor.reserve.start'));
            return;
        }

        if (this.req.method === 'POST') {
            sponsorLoginForm(this.req)(this.req, this.res, async () => {
                const form = this.req.form;
                if (form !== undefined && form.isValid) {
                    try {
                        // ユーザー認証
                        this.logger.debug('finding sponsor... user_id:', (<any>form).userId);
                        const sponsor = await Models.Sponsor.findOne(
                            {
                                user_id: (<any>form).userId
                            }
                        ).exec();

                        if (sponsor === null) {
                            form.errors.push(
                                this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') })
                            );
                            this.res.render('sponsor/auth/login');
                            return;
                        }

                        // パスワードチェック
                        if (sponsor.get('password_hash') !== Util.createHash((<any>form).password, sponsor.get('password_salt'))) {
                            form.errors.push(
                                this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') })
                            );
                            this.res.render('sponsor/auth/login');
                            return;
                        }

                        // ログイン記憶
                        if ((<any>form).remember === 'on') {
                            // トークン生成
                            const authentication = await Models.Authentication.create(
                                {
                                    token: Util.createToken(),
                                    sponsor: sponsor.get('_id'),
                                    locale: (<any>form).language
                                }
                            );
                            // tslint:disable-next-line:no-cookies
                            this.res.cookie(
                                'remember_sponsor',
                                authentication.get('token'),
                                { path: '/', httpOnly: true, maxAge: 604800000 }
                            );
                        }

                        // ログイン
                        (<Express.Session>this.req.session)[SponsorUser.AUTH_SESSION_NAME] = sponsor.toObject();
                        (<Express.Session>this.req.session)[SponsorUser.AUTH_SESSION_NAME].locale = (<any>this.req.form).language;

                        // if exist parameter cb, redirect to cb.
                        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : this.router.build('sponsor.mypage');
                        this.res.redirect(cb);
                    } catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                } else {
                    this.res.render('sponsor/auth/login');
                }
            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('sponsor/auth/login');
        }
    }

    public async logout(): Promise<void> {
        try {
            if (this.req.session === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }

            delete this.req.session[SponsorUser.AUTH_SESSION_NAME];
            await Models.Authentication.remove({ token: this.req.cookies.remember_sponsor }).exec();

            this.res.clearCookie('remember_sponsor');
            this.res.redirect(this.router.build('sponsor.reserve.start'));
        } catch (error) {
            this.next(error);
        }
    }
}
