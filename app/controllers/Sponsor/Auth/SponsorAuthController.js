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
const _ = require("underscore");
const Util = require("../../../../common/Util/Util");
const sponsorLoginForm_1 = require("../../../forms/sponsor/sponsorLoginForm");
const SponsorUser_1 = require("../../../models/User/SponsorUser");
const BaseController_1 = require("../../BaseController");
/**
 * 外部関係者認証コントローラー
 *
 * @export
 * @class SponsorAuthController
 * @extends {BaseController}
 */
class SponsorAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/sponsor/layout';
    }
    /**
     * sponsor login
     */
    login() {
        if (this.req.sponsorUser !== undefined && this.req.sponsorUser.isAuthenticated()) {
            this.res.redirect('/sponsor/reserve/start');
            return;
        }
        if (this.req.method === 'POST') {
            sponsorLoginForm_1.default(this.req)(this.req, this.res, () => __awaiter(this, void 0, void 0, function* () {
                const form = this.req.form;
                if (form !== undefined && form.isValid) {
                    try {
                        // ユーザー認証
                        this.logger.debug('finding sponsor... user_id:', form.userId);
                        const sponsor = yield chevre_domain_1.Models.Sponsor.findOne({
                            user_id: form.userId
                        }).exec();
                        if (sponsor === null) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('sponsor/auth/login');
                            return;
                        }
                        // パスワードチェック
                        if (sponsor.get('password_hash') !== Util.createHash(form.password, sponsor.get('password_salt'))) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('sponsor/auth/login');
                            return;
                        }
                        // ログイン記憶
                        if (form.remember === 'on') {
                            // トークン生成
                            const authentication = yield chevre_domain_1.Models.Authentication.create({
                                token: Util.createToken(),
                                sponsor: sponsor.get('_id'),
                                locale: form.language
                            });
                            // tslint:disable-next-line:no-cookies
                            this.res.cookie('remember_sponsor', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                        }
                        // ログイン
                        this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME] = sponsor.toObject();
                        this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME].locale = this.req.form.language;
                        // if exist parameter cb, redirect to cb.
                        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/sponsor/mypage';
                        this.res.redirect(cb);
                    }
                    catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                }
                else {
                    this.res.render('sponsor/auth/login');
                }
            }));
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('sponsor/auth/login');
        }
    }
    logout() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (this.req.session === undefined) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                delete this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME];
                yield chevre_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_sponsor }).exec();
                this.res.clearCookie('remember_sponsor');
                this.res.redirect('/sponsor/reserve/start');
            }
            catch (error) {
                this.next(error);
            }
        });
    }
}
exports.default = SponsorAuthController;
