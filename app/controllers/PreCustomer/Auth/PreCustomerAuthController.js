"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const conf = require("config");
const moment = require("moment");
const _ = require("underscore");
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
        if (this.req.headers['x-forwarded-for'] !== undefined && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
        }
        else {
            // 期限指定
            const now = moment();
            if (now < moment(conf.get('datetimes.reservation_start_pre_customers')) || moment(conf.get('datetimes.reservation_end_pre_customers')) < now) {
                this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
                return;
            }
        }
        if (this.req.preCustomerUser !== undefined && this.req.preCustomerUser.isAuthenticated()) {
            this.res.redirect(this.router.build('pre.reserve.start'));
            return;
        }
        if (this.req.method === 'POST') {
            preCustomerLoginForm_1.default(this.req)(this.req, this.res, () => __awaiter(this, void 0, void 0, function* () {
                const form = this.req.form;
                if (form !== undefined && form.isValid) {
                    try {
                        // ユーザー認証
                        this.logger.debug('finding preCustomer... user_id:', form.userId);
                        const preCustomer = yield chevre_domain_1.Models.PreCustomer.findOne({
                            user_id: form.userId
                        }).exec();
                        if (preCustomer === null) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('preCustomer/auth/login');
                            return;
                        }
                        // パスワードチェック
                        if (preCustomer.get('password_hash') !== Util.createHash(form.password, preCustomer.get('password_salt'))) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('preCustomer/auth/login');
                            return;
                        }
                        // ログイン記憶
                        if (form.remember === 'on') {
                            // トークン生成
                            const authentication = yield chevre_domain_1.Models.Authentication.create({
                                token: Util.createToken(),
                                pre_customer: preCustomer.get('_id'),
                                locale: form.language
                            });
                            // tslint:disable-next-line:no-cookies
                            this.res.cookie('remember_pre_customer', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                        }
                        // ログイン
                        this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME] = preCustomer.toObject();
                        this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME].locale = this.req.form.language;
                        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : this.router.build('pre.reserve.start');
                        this.res.redirect(cb);
                    }
                    catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                }
                else {
                    this.res.render('preCustomer/auth/login');
                }
            }));
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('preCustomer/auth/login');
        }
    }
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.req.session === undefined) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                delete this.req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME];
                yield chevre_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_pre_customer }).exec();
                this.res.clearCookie('remember_pre_customer');
                this.res.redirect(this.router.build('pre.reserve.start'));
            }
            catch (error) {
                this.next(error);
            }
        });
    }
}
exports.default = PreCustomerAuthController;
