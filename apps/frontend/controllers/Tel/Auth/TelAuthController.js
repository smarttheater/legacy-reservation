"use strict";
const BaseController_1 = require('../../BaseController');
const TelStaffUser_1 = require('../../../models/User/TelStaffUser');
const telLoginForm_1 = require('../../../forms/tel/telLoginForm');
const Util_1 = require('../../../../common/Util/Util');
const Models_1 = require('../../../../common/models/Models');
class TelAuthController extends BaseController_1.default {
    constructor(...args) {
        super(...args);
        this.layout = 'layouts/tel/layout';
    }
    /**
     * 窓口担当者ログイン
     */
    login() {
        if (this.telStaffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('tel.mypage'));
        }
        if (this.req.method === 'POST') {
            let form = telLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    Models_1.default.TelStaff.findOne({
                        user_id: this.req.form['userId']
                    }, (err, tel) => {
                        if (err)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!tel) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('tel/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (tel.get('password_hash') !== Util_1.default.createHash(this.req.form['password'], tel.get('password_salt'))) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('tel/auth/login');
                            }
                            else {
                                // ログイン
                                this.req.session[TelStaffUser_1.default.AUTH_SESSION_NAME] = tel.toObject();
                                // if exist parameter cb, redirect to cb.
                                let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('tel.mypage');
                                this.res.redirect(cb);
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
        this.res.redirect('/');
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelAuthController;
