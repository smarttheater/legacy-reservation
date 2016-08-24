"use strict";
const BaseController_1 = require('../../BaseController');
const StaffUser_1 = require('../../../models/User/StaffUser');
const staffLoginForm_1 = require('../../../forms/Staff/staffLoginForm');
const Util_1 = require('../../../../common/Util/Util');
const Models_1 = require('../../../../common/models/Models');
class StaffAuthController extends BaseController_1.default {
    constructor(...args) {
        super(...args);
        this.layout = 'layouts/staff/layout';
    }
    /**
     * 内部関係者ログイン
     */
    login() {
        if (this.req.staffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('staff.mypage'));
        }
        if (this.req.method === 'POST') {
            let form = staffLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding staff... user_id:', this.req.form['userId']);
                    Models_1.default.Staff.findOne({
                        user_id: this.req.form['userId']
                    }, (err, staff) => {
                        if (err)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!staff) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('staff/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (staff.get('password_hash') !== Util_1.default.createHash(this.req.form['password'], staff.get('password_salt'))) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('staff/auth/login');
                            }
                            else {
                                // ログイン記憶
                                let processRemember = (cb) => {
                                    if (this.req.form['remember']) {
                                        // トークン生成
                                        Models_1.default.Authentication.create({
                                            token: Util_1.default.createToken(),
                                            staff: staff.get('_id')
                                        }, (err, authentication) => {
                                            this.res.cookie('remember_staff', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
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
                                    this.req.session[StaffUser_1.default.AUTH_SESSION_NAME] = staff.toObject();
                                    this.req.session[StaffUser_1.default.AUTH_SESSION_NAME]['signature'] = this.req.form['signature'];
                                    this.req.session[StaffUser_1.default.AUTH_SESSION_NAME]['locale'] = this.req.form['language'];
                                    // if exist parameter cb, redirect to cb.
                                    let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('staff.mypage');
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
        delete this.req.session[StaffUser_1.default.AUTH_SESSION_NAME];
        this.res.clearCookie('remember_staff');
        this.res.redirect('/');
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffAuthController;
