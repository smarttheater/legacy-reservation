import { Models } from '@motionpicture/chevre-domain';
import * as mongoose from 'mongoose';
import * as Util from '../../../../common/Util/Util';
import windowLoginForm from '../../../forms/window/windowLoginForm';
import WindowUser from '../../../models/User/WindowUser';
import BaseController from '../../BaseController';

/**
 * 当日窓口認証コントローラー
 *
 * @export
 * @class WindowAuthController
 * @extends {BaseController}
 */
export default class WindowAuthController extends BaseController {
    public layout: string = 'layouts/window/layout';

    /**
     * 窓口担当者ログイン
     */
    public login(): void {
        if (!this.req.windowUser) return this.next(new Error(this.req.__('Message.UnexpectedError')));

        if (this.req.windowUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('window.mypage'));
        }

        if (this.req.method === 'POST') {
            windowLoginForm(this.req)(this.req, this.res, () => {
                const form = this.req.form;
                if (form && form.isValid) {

                    // ユーザー認証
                    Models.Window.findOne(
                        {
                            user_id: (<any>form).userId
                        },
                        (findWindowErr, window) => {
                            if (findWindowErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!window) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('window/auth/login');
                            } else {
                                // パスワードチェック
                                if (window.get('password_hash') !== Util.createHash((<any>form).password, window.get('password_salt'))) {
                                    form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                    this.res.render('window/auth/login');

                                } else {
                                    // ログイン記憶
                                    const processRemember = (cb: (err: Error | null, token: string | null) => void) => {
                                        if ((<any>form).remember) {
                                            // トークン生成
                                            Models.Authentication.create(
                                                {
                                                    token: Util.createToken(),
                                                    window: window.get('_id')
                                                },
                                                (createAuthenticationErr: any, authentication: mongoose.Document) => {
                                                    this.res.cookie('remember_window', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                                    cb(createAuthenticationErr, authentication.get('token'));
                                                }
                                            );
                                        } else {
                                            cb(null, null);
                                        }
                                    };

                                    processRemember((processRememberErr) => {
                                        if (!this.req.session) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                        if (processRememberErr) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                                        // ログイン
                                        this.req.session[WindowUser.AUTH_SESSION_NAME] = window.toObject();

                                        // if exist parameter cb, redirect to cb.
                                        const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('window.mypage');
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
        if (!this.req.session) return this.next(new Error(this.req.__('Message.UnexpectedError')));

        delete this.req.session[WindowUser.AUTH_SESSION_NAME];
        Models.Authentication.remove({ token: this.req.cookies.remember_window }, (err) => {
            if (err) return this.next(err);

            this.res.clearCookie('remember_window');
            this.res.redirect(this.router.build('window.mypage'));
        });
    }
}
