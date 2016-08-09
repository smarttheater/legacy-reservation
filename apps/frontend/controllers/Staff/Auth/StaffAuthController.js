"use strict";
const BaseController_1 = require('../../BaseController');
const StaffUser_1 = require('../../../models/User/StaffUser');
const staffLoginForm_1 = require('../../../forms/Staff/staffLoginForm');
const Util_1 = require('../../../../common/Util/Util');
const Models_1 = require('../../../../common/models/Models');
class StaffAuthController extends BaseController_1.default {
    /**
     * TODO 一般とadminの2種類の権限
     */
    login() {
        if (this.staffUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('staff.reserve.performances', {}));
        }
        if (this.req.method === 'POST') {
            let form = staffLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding staff... user_id:', this.req.form['userId']);
                    Models_1.default.Staff.findOne({
                        user_id: this.req.form['userId']
                    }, (err, staffDocument) => {
                        if (err || staffDocument === null) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('staff/auth/login', {
                                layout: 'layouts/staff/layout'
                            });
                        }
                        else {
                            // パスワードチェック
                            if (staffDocument.get('password_hash') !== Util_1.default.createHash(this.req.form['password'], staffDocument.get('password_salt'))) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('staff/auth/login', {
                                    layout: 'layouts/staff/layout'
                                });
                            }
                            else {
                                // ログイン
                                this.req.session[StaffUser_1.default.AUTH_SESSION_NAME] = staffDocument.toObject();
                                this.req.session[StaffUser_1.default.AUTH_SESSION_NAME]['signature'] = this.req.form['signature'];
                                // if exist parameter cb, redirect to cb.
                                let cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('staff.mypage');
                                this.res.redirect(cb);
                            }
                        }
                    });
                }
                else {
                    this.res.render('staff/auth/login', {
                        layout: 'layouts/staff/layout'
                    });
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.locals.signature = '';
            this.res.render('staff/auth/login', {
                layout: 'layouts/staff/layout'
            });
        }
    }
    logout() {
        delete this.req.session[StaffUser_1.default.AUTH_SESSION_NAME];
        this.res.redirect('/');
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffAuthController;
