"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../../../common/Util/Util");
const windowLoginForm_1 = require("../../../forms/window/windowLoginForm");
const WindowUser_1 = require("../../../models/User/WindowUser");
const BaseController_1 = require("../../BaseController");
class WindowAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/window/layout';
    }
    /**
     * 窓口担当者ログイン
     */
    login() {
        if (!this.req.windowUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        if (this.req.windowUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('window.mypage'));
        }
        if (this.req.method === 'POST') {
            windowLoginForm_1.default(this.req)(this.req, this.res, () => {
                const form = this.req.form;
                if (form && form.isValid) {
                    // ユーザー認証
                    ttts_domain_1.Models.Window.findOne({
                        user_id: form.userId
                    }, (findWindowErr, window) => {
                        if (findWindowErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!window) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('window/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (window.get('password_hash') !== Util_1.default.createHash(form.password, window.get('password_salt'))) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('window/auth/login');
                            }
                            else {
                                // ログイン記憶
                                const processRemember = (cb) => {
                                    if (form.remember) {
                                        // トークン生成
                                        ttts_domain_1.Models.Authentication.create({
                                            token: Util_1.default.createToken(),
                                            window: window.get('_id')
                                        }, (createAuthenticationErr, authentication) => {
                                            this.res.cookie('remember_window', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                            cb(createAuthenticationErr, authentication.get('token'));
                                        });
                                    }
                                    else {
                                        cb(null, null);
                                    }
                                };
                                processRemember((processRememberErr) => {
                                    if (!this.req.session)
                                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                    if (processRememberErr)
                                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                    // ログイン
                                    this.req.session[WindowUser_1.default.AUTH_SESSION_NAME] = window.toObject();
                                    // if exist parameter cb, redirect to cb.
                                    const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('window.mypage');
                                    this.res.redirect(cb);
                                });
                            }
                        }
                    });
                }
                else {
                    this.res.render('window/auth/login');
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('window/auth/login');
        }
    }
    logout() {
        if (!this.req.session)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        delete this.req.session[WindowUser_1.default.AUTH_SESSION_NAME];
        ttts_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_window }, (err) => {
            if (err)
                return this.next(err);
            this.res.clearCookie('remember_window');
            this.res.redirect(this.router.build('window.mypage'));
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WindowAuthController;
