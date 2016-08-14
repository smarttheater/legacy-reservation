import BaseController from '../../BaseController';
import TelStaffUser from '../../../models/User/TelStaffUser';
import telLoginForm from '../../../forms/tel/telLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';

export default class TelAuthController extends BaseController {
    /**
     * 窓口担当者ログイン
     */
    public login(): void {
        if (this.telStaffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('tel.mypage'));
        }

        if (this.req.method === 'POST') {
            let form = telLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    Models.TelStaff.findOne(
                        {
                            user_id: this.req.form['userId']
                        },
                        (err, tel) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!tel) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                this.res.render('tel/auth/login', {
                                    layout: 'layouts/tel/layout'
                                });
                            } else {
                                // パスワードチェック
                                if (tel.get('password_hash') !== Util.createHash(this.req.form['password'], tel.get('password_salt'))) {
                                    this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                    this.res.render('tel/auth/login', {
                                        layout: 'layouts/tel/layout'
                                    });

                                } else {
                                    // ログイン
                                    this.req.session[TelStaffUser.AUTH_SESSION_NAME] = tel.toObject();

                                    // if exist parameter cb, redirect to cb.
                                    let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('tel.mypage');
                                    this.res.redirect(cb);

                                }
                            }
                        }
                    );

                } else {
                    this.res.render('tel/auth/login', {
                        layout: 'layouts/tel/layout'
                    });

                }

            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('tel/auth/login', {
                layout: 'layouts/tel/layout'
            });

        }

    }

    public logout(): void {
        delete this.req.session[TelStaffUser.AUTH_SESSION_NAME];

        this.res.redirect('/');
    }
}
