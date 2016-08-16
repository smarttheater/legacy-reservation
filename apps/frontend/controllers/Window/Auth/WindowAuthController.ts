import BaseController from '../../BaseController';
import WindowUser from '../../../models/User/WindowUser';
import windowLoginForm from '../../../forms/window/windowLoginForm';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';

export default class WindowAuthController extends BaseController {
    public layout = 'layouts/window/layout';

    /**
     * 窓口担当者ログイン
     */
    public login(): void {
        if (this.req.windowUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('window.mypage'));
        }

        if (this.req.method === 'POST') {
            let form = windowLoginForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {

                    // ユーザー認証
                    Models.Window.findOne(
                        {
                            user_id: this.req.form['userId']
                        },
                        (err, window) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!window) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                this.res.render('window/auth/login');
                            } else {
                                // パスワードチェック
                                if (window.get('password_hash') !== Util.createHash(this.req.form['password'], window.get('password_salt'))) {
                                    this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.password')}));
                                    this.res.render('window/auth/login');

                                } else {
                                    // ログイン
                                    this.req.session[WindowUser.AUTH_SESSION_NAME] = window.toObject();

                                    // if exist parameter cb, redirect to cb.
                                    let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('window.mypage');
                                    this.res.redirect(cb);

                                }
                            }
                        }
                    );

                } else {
                    this.res.render('window/auth/login');

                }

            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('window/auth/login');

        }

    }

    public logout(): void {
        delete this.req.session[WindowUser.AUTH_SESSION_NAME];

        this.res.redirect('/');
    }
}
