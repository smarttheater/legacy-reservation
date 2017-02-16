"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const conf = require("config");
const moment = require("moment");
const Util_1 = require("../../../../common/Util/Util");
const preCustomerLoginForm_1 = require("../../../forms/preCustomer/preCustomerLoginForm");
const PreCustomerUser_1 = require("../../../models/User/PreCustomerUser");
const BaseController_1 = require("../../BaseController");
class PreCustomerAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/preCustomer/layout';
    }
    /**
     * pre customer login
     */
    login() {
        // MPのIPは許可
        if (this.req.headers['x-forwarded-for'] && this.req.headers['x-forwarded-for'].substr(0, 13) === '124.155.113.9') {
        }
        else {
            // 期限指定
            const now = moment();
            if (now < moment(conf.get('datetimes.reservation_start_pre_customers')) || moment(conf.get('datetimes.reservation_end_pre_customers')) < now) {
                return this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
            }
        }
        if (this.req.preCustomerUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('pre.reserve.start'));
        }
        if (this.req.method === 'POST') {
            const form = preCustomerLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding preCustomer... user_id:', this.req.form['userId']);
                    ttts_domain_1.Models.PreCustomer.findOne({
                        user_id: this.req.form['userId']
                    }, (err, preCustomer) => {
                        if (err)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!preCustomer) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('preCustomer/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (preCustomer.get('password_hash') !== Util_1.default.createHash(this.req.form['password'], preCustomer.get('password_salt'))) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('preCustomer/auth/login');
                            }
                            else {
                                // ログイン記憶
                                const processRemember = (cb) => {
                                    if (this.req.form['remember']) {
                                        // トークン生成
                                        ttts_domain_1.Models.Authentication.create({
                                            token: Util_1.default.createToken(),
                                            pre_customer: preCustomer.get('_id'),
                                            locale: this.req.form['language']
                                        }, (err, authentication) => {
                                            this.res.cookie('remember_pre_customer', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
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
                                    this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME] = preCustomer.toObject();
                                    this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME]['locale'] = this.req.form['language'];
                                    // if exist parameter cb, redirect to cb.
                                    const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('pre.reserve.start');
                                    this.res.redirect(cb);
                                });
                            }
                        }
                    });
                }
                else {
                    this.res.render('preCustomer/auth/login');
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('preCustomer/auth/login');
        }
    }
    logout() {
        delete this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME];
        ttts_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_pre_customer }, (err) => {
            this.res.clearCookie('remember_pre_customer');
            this.res.redirect(this.router.build('pre.reserve.start'));
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreCustomerAuthController;
