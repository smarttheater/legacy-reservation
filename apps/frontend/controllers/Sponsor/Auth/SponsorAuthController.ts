import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import sponsorLoginForm from '../../../forms/Sponsor/sponsorLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';

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
            let form = sponsorLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding sponsor... user_id:', this.req.form['userId']);
                    Models.Sponsor.findOne(
                        {
                            user_id: this.req.form['userId']
                        },
                        (err, sponsorDocument) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!sponsorDocument) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                this.res.render('sponsor/auth/login');
                            } else {
                                // パスワードチェック
                                if (sponsorDocument.get('password_hash') !== Util.createHash(this.req.form['password'], sponsorDocument.get('password_salt'))) {
                                    this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                    this.res.render('sponsor/auth/login');

                                } else {
                                    // ログイン
                                    this.req.session[SponsorUser.AUTH_SESSION_NAME] = sponsorDocument.toObject();
                                    this.req.session[SponsorUser.AUTH_SESSION_NAME]['locale'] = this.req.form['language'];

                                    // if exist parameter cb, redirect to cb.
                                    let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('sponsor.mypage');
                                    this.res.redirect(cb);

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

        this.res.redirect('/');
    }
}
