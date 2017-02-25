"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../../../common/Util/Util");
const telLoginForm_1 = require("../../../forms/tel/telLoginForm");
const TelStaffUser_1 = require("../../../models/User/TelStaffUser");
const BaseController_1 = require("../../BaseController");
/**
 * 電話窓口認証コントローラー
 *
 * @export
 * @class TelAuthController
 * @extends {BaseController}
 */
class TelAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/tel/layout';
    }
    /**
     * 窓口担当者ログイン
     */
    login() {
        if (this.req.telStaffUser && this.req.telStaffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('tel.mypage'));
        }
        if (this.req.method === 'POST') {
            telLoginForm_1.default(this.req)(this.req, this.res, () => {
                const form = this.req.form;
                if (form && form.isValid) {
                    // ユーザー認証
                    chevre_domain_1.Models.TelStaff.findOne({
                        user_id: form.userId
                    }, (findTelStaffErr, telStaff) => {
                        if (findTelStaffErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!telStaff) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('tel/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (telStaff.get('password_hash') !== Util.createHash(form.password, telStaff.get('password_salt'))) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('tel/auth/login');
                            }
                            else {
                                // ログイン記憶
                                const processRemember = (cb) => {
                                    if (form.remember) {
                                        // トークン生成
                                        chevre_domain_1.Models.Authentication.create({
                                            token: Util.createToken(),
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
                                processRemember((processRememberErr) => {
                                    if (!this.req.session)
                                        return this.next(new Error(this.req.__('Message.UnexpectedError')));
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
        if (!this.req.session)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        delete this.req.session[TelStaffUser_1.default.AUTH_SESSION_NAME];
        chevre_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_tel_staff }, (err) => {
            if (err)
                return this.next(err);
            this.res.clearCookie('remember_tel_staff');
            this.res.redirect(this.router.build('tel.mypage'));
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelAuthController;
