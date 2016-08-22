import BaseController from '../../BaseController';
import StaffUser from '../../../models/User/StaffUser';
import staffLoginForm from '../../../forms/Staff/staffLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';

export default class StaffAuthController extends BaseController {
    public layout = 'layouts/staff/layout';

    /**
     * 内部関係者ログイン
     */
    public login(): void {
        if (this.req.staffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('staff.mypage'));
        }

        if (this.req.method === 'POST') {
            let form = staffLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    this.logger.debug('finding staff... user_id:', this.req.form['userId']);
                    Models.Staff.findOne(
                        {
                            user_id: this.req.form['userId']
                        },
                        (err, staffDocument) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!staffDocument) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                this.res.render('staff/auth/login');
                            } else {
                                // パスワードチェック
                                if (staffDocument.get('password_hash') !== Util.createHash(this.req.form['password'], staffDocument.get('password_salt'))) {
                                    this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                    this.res.render('staff/auth/login');

                                } else {
                                    // ログイン
                                    this.req.session[StaffUser.AUTH_SESSION_NAME] = staffDocument.toObject();
                                    this.req.session[StaffUser.AUTH_SESSION_NAME]['signature'] = this.req.form['signature'];
                                    this.req.session[StaffUser.AUTH_SESSION_NAME]['locale'] = this.req.form['language'];

                                    // if exist parameter cb, redirect to cb.
                                    let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('staff.mypage');
                                    this.res.redirect(cb);

                                }

                            }
                        }
                    );

                } else {
                    this.res.render('staff/auth/login');

                }

            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.locals.signature = '';

            this.res.render('staff/auth/login');

        }

    }

    public logout(): void {
        delete this.req.session[StaffUser.AUTH_SESSION_NAME];

        this.res.redirect('/');
    }
}
