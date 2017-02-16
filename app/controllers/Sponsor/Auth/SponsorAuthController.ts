import {Models} from '@motionpicture/ttts-domain';
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
        if (this.req.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.start'));
        }

        if (this.req.method === 'POST') {
            const form = sponsorLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding sponsor... user_id:', this.req.form['userId']);
                    Models.Sponsor.findOne(
                        {
                            user_id: this.req.form['userId']
                        },
                        (err, sponsor) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!sponsor) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                this.res.render('sponsor/auth/login');
                            } else {
                                // パスワードチェック
                                if (sponsor.get('password_hash') !== Util.createHash(this.req.form['password'], sponsor.get('password_salt'))) {
                                    this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                    this.res.render('sponsor/auth/login');

                                } else {
                                    // ログイン記憶
                                    const processRemember = (cb: (err: Error, token: string) => void) => {
                                        if (this.req.form['remember']) {
                                            // トークン生成
                                            Models.Authentication.create(
                                                {
                                                    token: Util.createToken(),
                                                    sponsor: sponsor.get('_id'),
                                                    locale: this.req.form['language']
                                                },
                                                (err, authentication) => {
                                                    this.res.cookie('remember_sponsor', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                                    cb(err, authentication.get('token'));
                                                }
                                            );
                                        } else {
                                            cb(null, null);
                                        }
                                    };

                                    processRemember((err, token) => {
                                        if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                                        // ログイン
                                        this.req.session[SponsorUser.AUTH_SESSION_NAME] = sponsor.toObject();
                                        this.req.session[SponsorUser.AUTH_SESSION_NAME]['locale'] = this.req.form['language'];

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
        delete this.req.session[SponsorUser.AUTH_SESSION_NAME];
        Models.Authentication.remove({token: this.req.cookies.remember_sponsor}, (err) => {
            this.res.clearCookie('remember_sponsor');
            this.res.redirect(this.router.build('sponsor.reserve.start'));
        });
    }
}
