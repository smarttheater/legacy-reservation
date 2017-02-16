"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../../../common/Util/Util");
const sponsorLoginForm_1 = require("../../../forms/sponsor/sponsorLoginForm");
const SponsorUser_1 = require("../../../models/User/SponsorUser");
const BaseController_1 = require("../../BaseController");
class SponsorAuthController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/sponsor/layout';
    }
    /**
     * sponsor login
     */
    login() {
        if (this.req.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.start'));
        }
        if (this.req.method === 'POST') {
            const form = sponsorLoginForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding sponsor... user_id:', this.req.form.userId);
                    ttts_domain_1.Models.Sponsor.findOne({
                        user_id: this.req.form.userId
                    }, (findSponsorErr, sponsor) => {
                        if (findSponsorErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        if (!sponsor) {
                            this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                            this.res.render('sponsor/auth/login');
                        }
                        else {
                            // パスワードチェック
                            if (sponsor.get('password_hash') !== Util_1.default.createHash(this.req.form.password, sponsor.get('password_salt'))) {
                                this.req.form.errors.push(this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.password') }));
                                this.res.render('sponsor/auth/login');
                            }
                            else {
                                // ログイン記憶
                                const processRemember = (cb) => {
                                    if (this.req.form.remember) {
                                        // トークン生成
                                        ttts_domain_1.Models.Authentication.create({
                                            token: Util_1.default.createToken(),
                                            sponsor: sponsor.get('_id'),
                                            locale: this.req.form.language
                                        }, (createAuthenticationErr, authentication) => {
                                            this.res.cookie('remember_sponsor', authentication.get('token'), { path: '/', httpOnly: true, maxAge: 604800000 });
                                            cb(err, authentication.get('token'));
                                        });
                                    }
                                    else {
                                        cb(null, null);
                                    }
                                };
                                processRemember((processRememberErr, token) => {
                                    if (err)
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
        delete this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME];
        ttts_domain_1.Models.Authentication.remove({ token: this.req.cookies.remember_sponsor }, (err) => {
            this.res.clearCookie('remember_sponsor');
            this.res.redirect(this.router.build('sponsor.reserve.start'));
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorAuthController;
