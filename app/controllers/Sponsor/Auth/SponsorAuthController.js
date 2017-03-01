"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
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
        if (this.req.sponsorUser && this.req.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.start'));
        }
        if (this.req.method === 'POST') {
            sponsorLoginForm_1.default(this.req)(this.req, this.res, (err) => {
                const form = this.req.form;
                if (form && form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding sponsor... user_id:', form.userId);
                    chevre_domain_1.Models.Sponsor.findOne({
                        user_id: form.userId
                    }, (findSponsorErr, sponsor) => {
                        if (findSponsorErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!sponsor) {
                            form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('sponsor/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (sponsor.get('password_hash') !== Util.createHash(form.password, sponsor.get('password_salt'))) {
                                form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('sponsor/auth/login');
                            }
                            else {
                                // ログイン記憶
                                const processRemember = (cb) => {
                                    if (form.remember) {
                                        // トークン生成
                                        chevre_domain_1.Models.Authentication.create({
                                            token: Util.createToken(),
                                            sponsor: sponsor.get('_id'),
                                            locale: form.language
                                        }, (createAuthenticationErr, authentication) => {
                                            if (createAuthenticationErr)
                                                return cb(createAuthenticationErr, null);
                                            this.res.cookie('remember_sponsor', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                            cb(err, authentication.get('token'));
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
                                    this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME] = sponsor.toObject();
                                    this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME].locale = this.req.form.language;
                                    // if exist parameter cb, redirect to cb.
                                    const cb = (this.req.query.cb) ? this.req.query.cb : this.router.build('sponsor.mypage');
                                    this.res.redirect(cb);
                                });
                            }
                        }
                    });
                }
                else {
                    this.res.render('sponsor/auth/login');
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('sponsor/auth/login');
        }
    }
    logout() {
        if (!this.req.session)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        delete this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME];
        chevre_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_sponsor }, (err) => {
            if (err)
                return this.next(err);
            this.res.clearCookie('remember_sponsor');
            this.res.redirect(this.router.build('sponsor.reserve.start'));
        });
    }
}
exports.default = SponsorAuthController;
