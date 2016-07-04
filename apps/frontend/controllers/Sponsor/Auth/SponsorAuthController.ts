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
            sponsorLoginForm(this.req, this.res, (err) => {
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
                            this.res.render('sponsor/auth/login', {
                            });
                        } else {
                            // ログイン
                            this.req.session[SponsorUser.AUTH_SESSION_NAME] = sponsorDocument.toObject();

                            this.res.redirect(this.router.build('sponsor.mypage', {}));
                        }
                    });

                } else {
                    this.res.render('sponsor/auth/login', {
                    });

                }

            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('sponsor/auth/login', {
            });

        }

    }

    public logout(): void {
        delete this.req.session[SponsorUser.AUTH_SESSION_NAME];

        this.res.redirect('/');
    }
}
