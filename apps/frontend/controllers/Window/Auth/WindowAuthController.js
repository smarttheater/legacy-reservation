"use strict";
const BaseController_1 = require('../../BaseController');
const WindowUser_1 = require('../../../models/User/WindowUser');
const windowLoginForm_1 = require('../../../forms/window/windowLoginForm');
const Util_1 = require('../../../../common/Util/Util');
const Models_1 = require('../../../../common/models/Models');
class WindowAuthController extends BaseController_1.default {
    constructor(...args) {
        super(...args);
        this.layout = 'layouts/window/layout';
    }
    /**
     * 窓口担当者ログイン
     */
    login() {
        if (this.req.windowUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('window.mypage'));
        }
        if (this.req.method === 'POST') {
            let form = windowLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    Models_1.default.Window.findOne({
                        user_id: this.req.form['userId']
                    }, (err, window) => {
                        if (err)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!window) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('window/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (window.get('password_hash') !== Util_1.default.createHash(this.req.form['password'], window.get('password_salt'))) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('window/auth/login');
                            }
                            else {
                                // ログイン記憶
                                let processRemember = (cb) => {
                                    if (this.req.form['remember']) {
                                        // トークン生成
                                        Models_1.default.Authentication.create({
                                            token: Util_1.default.createToken(),
                                            window: window.get('_id')
                                        }, (err, authentication) => {
                                            this.res.cookie('remember_window', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                            cb(err, authentication.get('token'));
                                        });
                                    }
                                    else {
                                        cb(null, null);
                                    }
                                };
                                processRemember((err, token) => {
                                    if (err)
                                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                    // ログイン
                                    this.req.session[WindowUser_1.default.AUTH_SESSION_NAME] = window.toObject();
                                    // if exist parameter cb, redirect to cb.
                                    let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('window.mypage');
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
        delete this.req.session[WindowUser_1.default.AUTH_SESSION_NAME];
        Models_1.default.Authentication.remove({ token: this.req.cookies.remember_window }, (err) => {
            this.res.clearCookie('remember_window');
            this.res.redirect(this.router.build('window.mypage'));
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WindowAuthController;
