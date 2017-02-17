"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../../../common/Util/Util");
const staffLoginForm_1 = require("../../../forms/staff/staffLoginForm");
const StaffUser_1 = require("../../../models/User/StaffUser");
const BaseController_1 = require("../../BaseController");
class StaffAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/staff/layout';
    }
    /**
     * 内部関係者ログイン
     */
    login() {
        if (this.req.staffUser && this.req.staffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('staff.mypage'));
        }
        if (this.req.method === 'POST') {
            staffLoginForm_1.default(this.req)(this.req, this.res, () => {
                const form = this.req.form;
                if (form && form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding staff... user_id:', form.userId);
                    ttts_domain_1.Models.Staff.findOne({
                        user_id: form.userId
                    }, (findStaffErr, staff) => {
                        if (findStaffErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!staff) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('staff/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (staff.get('password_hash') !== Util_1.default.createHash(form.password, staff.get('password_salt'))) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('staff/auth/login');
                            }
                            else {
                                // ログイン記憶
                                const processRemember = (cb) => {
                                    if (form.remember) {
                                        // トークン生成
                                        ttts_domain_1.Models.Authentication.create({
                                            token: Util_1.default.createToken(),
                                            staff: staff.get('_id'),
                                            signature: form.signature,
                                            locale: form.language
                                        }, (createAuthenticationErr, authentication) => {
                                            this.res.cookie('remember_staff', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
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
                                    this.req.session[StaffUser_1.default.AUTH_SESSION_NAME] = staff.toObject();
                                    this.req.session[StaffUser_1.default.AUTH_SESSION_NAME].signature = form.signature;
                                    this.req.session[StaffUser_1.default.AUTH_SESSION_NAME].locale = form.language;
                                    // if exist parameter cb, redirect to cb.
                                    const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('staff.mypage');
                                    this.res.redirect(cb);
                                });
                            }
                        }
                    });
                }
                else {
                    this.res.render('staff/auth/login');
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.locals.signature = '';
            this.res.render('staff/auth/login');
        }
    }
    logout() {
        if (!this.req.session)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        delete this.req.session[StaffUser_1.default.AUTH_SESSION_NAME];
        ttts_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_staff }, (err) => {
            if (err)
                return this.next(err);
            this.res.clearCookie('remember_staff');
            this.res.redirect(this.router.build('staff.mypage'));
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffAuthController;
