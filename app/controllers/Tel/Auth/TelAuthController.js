"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../../../common/Util/Util");
const telLoginForm_1 = require("../../../forms/tel/telLoginForm");
const TelStaffUser_1 = require("../../../models/User/TelStaffUser");
const BaseController_1 = require("../../BaseController");
class TelAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/tel/layout';
    }
    /**
     * 窓口担当者ログイン
     */
    login() {
        if (this.req.telStaffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('tel.mypage'));
        }
        if (this.req.method === 'POST') {
            const form = telLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    ttts_domain_1.Models.TelStaff.findOne({
                        user_id: this.req.form.userId
                    }, (findTelStaffErr, telStaff) => {
                        if (findTelStaffErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!telStaff) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('tel/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (telStaff.get('password_hash') !== Util_1.default.createHash(this.req.form.password, telStaff.get('password_salt'))) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('tel/auth/login');
                            }
                            else {
                                // ログイン記憶
                                const processRemember = (cb) => {
                                    if (this.req.form.remember) {
                                        // トークン生成
                                        ttts_domain_1.Models.Authentication.create({
                                            token: Util_1.default.createToken(),
                                            tel_staff: telStaff.get('_id')
                                        }, (createAuthenticationErr, authentication) => {
                                            this.res.cookie('remember_tel_staff', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                            cb(createAuthenticationErr, authentication.get('token'));
                                        });
                                    }
                                    else {
                                        cb(null, null);
                                    }
                                };
                                processRemember((processRememberErr, token) => {
                                    if (processRememberErr)
                                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                    // ログイン
                                    this.req.session[TelStaffUser_1.default.AUTH_SESSION_NAME] = telStaff.toObject();
                                    // if exist parameter cb, redirect to cb.
                                    const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('tel.mypage');
                                    this.res.redirect(cb);
                                });
                            }
                        }
                    });
                }
                else {
                    this.res.render('tel/auth/login');
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('tel/auth/login');
        }
    }
    logout() {
        delete this.req.session[TelStaffUser_1.default.AUTH_SESSION_NAME];
        ttts_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_tel_staff }, (err) => {
            this.res.clearCookie('remember_tel_staff');
            this.res.redirect(this.router.build('tel.mypage'));
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelAuthController;
