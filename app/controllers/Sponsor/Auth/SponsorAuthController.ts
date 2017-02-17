import { Models } from '@motionpicture/ttts-domain';
import * as mongoose from 'mongoose';
import Util from '../../../../common/Util/Util';
import sponsorLoginForm from '../../../forms/sponsor/sponsorLoginForm';
import SponsorUser from '../../../models/User/SponsorUser';
import BaseController from '../../BaseController';

export default class SponsorAuthController extends BaseController {
    public layout = 'layouts/sponsor/layout';

    /**
     * sponsor login
     */
    public login(): void {
        if (this.req.sponsorUser && this.req.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.start'));
        }

        if (this.req.method === 'POST') {
            sponsorLoginForm(this.req)(this.req, this.res, (err) => {
                const form = this.req.form;
                if (form && form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding sponsor... user_id:', (<any>form).userId);
                    Models.Sponsor.findOne(
                        {
                            user_id: (<any>form).userId
                        },
                        (findSponsorErr, sponsor) => {
                            if (findSponsorErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!sponsor) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('sponsor/auth/login');
                            } else {
                                // パスワードチェック
                                if (sponsor.get('password_hash') !== Util.createHash((<any>form).password, sponsor.get('password_salt'))) {
                                    form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                    this.res.render('sponsor/auth/login');

                                } else {
                                    // ログイン記憶
                                    const processRemember = (cb: (err: Error | null, token: string | null) => void) => {
                                        if ((<any>form).remember) {
                                            // トークン生成
                                            Models.Authentication.create(
                                                {
                                                    token: Util.createToken(),
                                                    sponsor: sponsor.get('_id'),
                                                    locale: (<any>form).language
                                                },
                                                (createAuthenticationErr: any, authentication: mongoose.Document) => {
                                                    if (createAuthenticationErr) return cb(createAuthenticationErr, null);

                                                    this.res.cookie('remember_sponsor', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                                    cb(err, authentication.get('token'));
                                                }
                                            );
                                        } else {
                                            cb(null, null);
                                        }
                                    };

                                    processRemember((processRememberErr) => {
                                        if (!this.req.session) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                        if (processRememberErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                                        // ログイン
                                        this.req.session[SponsorUser.AUTH_SESSION_NAME] = sponsor.toObject();
                                        this.req.session[SponsorUser.AUTH_SESSION_NAME].locale = (<any>this.req.form).language;

                                        // if exist parameter cb, redirect to cb.
                                        const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('sponsor.mypage');
                                        this.res.redirect(cb);
                                    });
                                }
                            }
                        }
                    );
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

    public logout(): void {
        if (!this.req.session) return this.next(new Error(this.req.__('Message.UnexpectedError')));

        delete this.req.session[SponsorUser.AUTH_SESSION_NAME];
        Models.Authentication.remove({ token: this.req.cookies.remember_sponsor }, (err) => {
            if (err) return this.next(err);

            this.res.clearCookie('remember_sponsor');
            this.res.redirect(this.router.build('sponsor.reserve.start'));
        });
    }
}
