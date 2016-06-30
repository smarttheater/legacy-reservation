import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import SponsorLoginForm from '../../../forms/Sponsor/SponsorLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';

export default class SponsorAuthController extends BaseController {
    public login(): void {
        if (this.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.performances', {}));
        }

        let sponsorLoginForm = new SponsorLoginForm();
        if (this.req.method === 'POST') {

            sponsorLoginForm.form.handle(this.req, {
                success: (form) => {
                    sponsorLoginForm.form = form;

                    // ユーザー認証
                    this.logger.debug('finding sponsor... user_id:', form.data.user_id);
                    Models.Sponsor.findOne(
                    {
                        user_id: form.data.user_id,
                        password: form.data.password,
                    },
                    (err, sponsorDocument) => {

                        if (err || sponsorDocument === null) {
                            this.res.render('sponsor/auth/login', {
                                form: form,
                            });
                        } else {
                            // ログイン
                            this.req.session[SponsorUser.AUTH_SESSION_NAME] = sponsorDocument.toObject();

                            this.res.redirect(this.router.build('sponsor.mypage', {}));
                        }
                    });
                },
                error: (form) => {
                    this.res.render('sponsor/auth/login', {
                        form: form,
                    });
                },
                empty: (form) => {
                    this.res.render('sponsor/auth/login', {
                        form: form,
                    });
                }
            });


        } else {
            this.res.render('sponsor/auth/login', {
                form: sponsorLoginForm.form,
            });
        }
    }

    public logout(): void {
        delete this.req.session[SponsorUser.AUTH_SESSION_NAME];

        this.res.redirect('/');
    }
}
