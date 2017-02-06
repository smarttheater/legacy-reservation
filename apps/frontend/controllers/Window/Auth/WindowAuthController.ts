import BaseController from '../../BaseController';
import WindowUser from '../../../models/User/WindowUser';
import windowLoginForm from '../../../forms/window/windowLoginForm';
import Util from '../../../../common/Util/Util';
import {Models} from "@motionpicture/ttts-domain";

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
                                    // ログイン記憶
                                    let processRemember = (cb: (err: Error, token: string) => void) => {
                                        if (this.req.form['remember']) {
                                            // トークン生成
                                            Models.Authentication.create(
                                                {
                                                    token: Util.createToken(),
                                                    window: window.get('_id')
                                                },
                                                (err, authentication) => {
                                                    this.res.cookie('remember_window', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                                    cb(err, authentication.get('token'));
                                                }
                                            );
                                        } else {
                                            cb(null, null);
                                        }
                                    }

                                    processRemember((err, token) => {
                                        if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                                        // ログイン
                                        this.req.session[WindowUser.AUTH_SESSION_NAME] = window.toObject();

                                        // if exist parameter cb, redirect to cb.
                                        let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('window.mypage');
                                        this.res.redirect(cb);
                                    });
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
        Models.Authentication.remove({token: this.req.cookies.remember_window}, (err) => {
            this.res.clearCookie('remember_window');
            this.res.redirect(this.router.build('window.mypage'));
        });
    }
}
