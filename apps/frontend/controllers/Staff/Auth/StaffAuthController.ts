import BaseController from '../../BaseController';
import StaffUser from '../../../models/User/StaffUser';
import staffLoginForm from '../../../forms/Staff/staffLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';

export default class StaffAuthController extends BaseController {
    public login(): void {
        if (this.staffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('staff.reserve.performances', {}));
        }

        if (this.req.method === 'POST') {
            let form = staffLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding staff... user_id:', this.req.form['userId']);
                    Models.Staff.findOne(
                    {
                        user_id: this.req.form['userId'],
                        password: this.req.form['password'],
                    },
                    (err, staffDocument) => {

                        if (err || staffDocument === null) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                            this.res.render('staff/auth/login', {
                                layout: 'layouts/staff/layout'
                            });
                        } else {
                            // ログイン
                            this.req.session[StaffUser.AUTH_SESSION_NAME] = staffDocument.toObject();
                            this.req.session[StaffUser.AUTH_SESSION_NAME]['signature'] = this.req.form['signature'];

                            this.res.redirect(this.router.build('staff.mypage', {}));
                        }
                    });

                } else {
                    this.res.render('staff/auth/login', {
                        layout: 'layouts/staff/layout'
                    });

                }

            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.locals.signature = '';

            this.res.render('staff/auth/login', {
                layout: 'layouts/staff/layout'
            });

        }

    }

    public logout(): void {
        delete this.req.session[StaffUser.AUTH_SESSION_NAME];

        this.res.redirect('/');
    }
}
