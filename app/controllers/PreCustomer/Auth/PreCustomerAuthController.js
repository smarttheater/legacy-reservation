"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const conf = require("config");
const moment = require("moment");
const Util = require("../../../../common/Util/Util");
const preCustomerLoginForm_1 = require("../../../forms/preCustomer/preCustomerLoginForm");
const PreCustomerUser_1 = require("../../../models/User/PreCustomerUser");
const BaseController_1 = require("../../BaseController");
/**
 * 先行予約認証コントローラー
 *
 * @export
 * @class PreCustomerAuthController
 * @extends {BaseController}
 */
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
        // tslint:disable-next-line:no-empty
        if (this.req.headers['x-forwarded-for'] && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
        }
        else {
            // 期限指定
            const now = moment();
            if (now < moment(conf.get('datetimes.reservation_start_pre_customers')) || moment(conf.get('datetimes.reservation_end_pre_customers')) < now) {
                return this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
            }
        }
        if (this.req.preCustomerUser && this.req.preCustomerUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('pre.reserve.start'));
        }
        if (this.req.method === 'POST') {
            preCustomerLoginForm_1.default(this.req)(this.req, this.res, () => {
                const form = this.req.form;
                if (form && form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding preCustomer... user_id:', form.userId);
                    ttts_domain_1.Models.PreCustomer.findOne({
                        user_id: form.userId
                    }, (findPreCustomerErr, preCustomer) => {
                        if (findPreCustomerErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!preCustomer) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('preCustomer/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (preCustomer.get('password_hash') !== Util.createHash(form.password, preCustomer.get('password_salt'))) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('preCustomer/auth/login');
                            }
                            else {
                                // ログイン記憶
                                const processRemember = (cb) => {
                                    if (form.remember) {
                                        // トークン生成
                                        ttts_domain_1.Models.Authentication.create({
                                            token: Util.createToken(),
                                            pre_customer: preCustomer.get('_id'),
                                            locale: form.language
                                        }, (createAuthenticationErr, authentication) => {
                                            this.res.cookie('remember_pre_customer', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
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
                                    this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME] = preCustomer.toObject();
                                    this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME].locale = this.req.form.language;
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
        if (!this.req.session)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        delete this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME];
        ttts_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_pre_customer }, (err) => {
            if (err)
                return this.next(err);
            this.res.clearCookie('remember_pre_customer');
            this.res.redirect(this.router.build('pre.reserve.start'));
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreCustomerAuthController;
