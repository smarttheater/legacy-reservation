import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import sponsorLoginForm from '../../../forms/Sponsor/sponsorLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';

export default class SponsorAuthController extends BaseController {
    public login(): void {
        if (this.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.performances', {}));
        }

        if (this.req.method === 'POST') {
            let form = sponsorLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding sponsor... user_id:', this.req.form['userId']);
                    Models.Sponsor.findOne(
                    {
                        user_id: this.req.form['userId'],
                        password: this.req.form['password'],
                    },
                    (err, sponsorDocument) => {

                        if (err || sponsorDocument === null) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                            this.res.render('sponsor/auth/login', {
                                layout: 'layouts/sponsor/layout'
                            });
                        } else {
                            // ログイン
                            this.req.session[SponsorUser.AUTH_SESSION_NAME] = sponsorDocument.toObject();

                            this.res.redirect(this.router.build('sponsor.mypage', {}));
                        }
                    });

                } else {
                    this.res.render('sponsor/auth/login', {
                        layout: 'layouts/sponsor/layout'
                    });

                }

            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('sponsor/auth/login', {
                layout: 'layouts/sponsor/layout'
            });

        }

    }

    public logout(): void {
        delete this.req.session[SponsorUser.AUTH_SESSION_NAME];

        this.res.redirect('/');
    }
}
