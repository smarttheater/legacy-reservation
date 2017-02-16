"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../common/Util/Util");
const SponsorAuthController_1 = require("../controllers/Sponsor/Auth/SponsorAuthController");
const SponsorCancelController_1 = require("../controllers/Sponsor/Cancel/SponsorCancelController");
const SponsorMyPageController_1 = require("../controllers/Sponsor/MyPage/SponsorMyPageController");
const SponsorReserveController_1 = require("../controllers/Sponsor/Reserve/SponsorReserveController");
const SponsorUser_1 = require("../models/User/SponsorUser");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    const authenticationMiddleware = (req, res, next) => {
        if (!req.sponsorUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb) => {
                if (req.cookies.remember_sponsor) {
                    ttts_domain_1.Models.Authentication.findOne({
                        token: req.cookies.remember_sponsor,
                        sponsor: { $ne: null }
                    }, (err, authentication) => {
                        if (err)
                            return cb(null, null);
                        if (authentication) {
                            // トークン再生成
                            const token = Util_1.default.createToken();
                            authentication.update({
                                token: token
                            }, (updateErr) => {
                                if (updateErr)
                                    return cb(null, null);
                                res.cookie('remember_sponsor', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                ttts_domain_1.Models.Sponsor.findOne({ _id: authentication.get('sponsor') }, (findErr, sponsor) => {
                                    (findErr) ? cb(null, null) : cb(sponsor, authentication.get('locale'));
                                });
                            });
                        }
                        else {
                            res.clearCookie('remember_sponsor');
                            cb(null, null);
                        }
                    });
                }
                else {
                    cb(null, null);
                }
            };
            checkRemember((user, locale) => {
                if (user) {
                    // ログインしてリダイレクト
                    req.session[SponsorUser_1.default.AUTH_SESSION_NAME] = user.toObject();
                    req.session[SponsorUser_1.default.AUTH_SESSION_NAME].locale = locale;
                    // if exist parameter cb, redirect to cb.
                    res.redirect(req.originalUrl);
                }
                else {
                    if (req.xhr) {
                        res.json({
                            message: 'login required.'
                        });
                    }
                    else {
                        res.redirect(`/sponsor/login?cb=${req.originalUrl}`);
                    }
                }
            });
        }
        else {
            // 言語設定
            req.setLocale((req.sponsorUser.get('locale')) ? req.sponsorUser.get('locale') : 'en');
            next();
        }
    };
    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req, _res, next) => {
        req.sponsorUser = SponsorUser_1.default.parse(req.session);
        next();
    };
    // 外部関係者
    app.all('/sponsor/login', 'sponsor.mypage.login', baseMiddleware, (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).login(); });
    app.all('/sponsor/logout', 'sponsor.logout', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).logout(); });
    app.all('/sponsor/mypage', 'sponsor.mypage', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorMyPageController_1.default(req, res, next)).index(); });
    app.get('/sponsor/mypage/search', 'sponsor.mypage.search', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorMyPageController_1.default(req, res, next)).search(); });
    app.get('/sponsor/reserve/start', 'sponsor.reserve.start', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).start(); });
    app.all('/sponsor/reserve/:token/terms', 'sponsor.reserve.terms', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).terms(); });
    app.all('/sponsor/reserve/:token/performances', 'sponsor.reserve.performances', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).performances(); });
    app.all('/sponsor/reserve/:token/seats', 'sponsor.reserve.seats', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).seats(); });
    app.all('/sponsor/reserve/:token/tickets', 'sponsor.reserve.tickets', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).tickets(); });
    app.all('/sponsor/reserve/:token/profile', 'sponsor.reserve.profile', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).profile(); });
    app.all('/sponsor/reserve/:token/confirm', 'sponsor.reserve.confirm', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).confirm(); });
    app.get('/sponsor/reserve/:paymentNo/complete', 'sponsor.reserve.complete', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).complete(); });
    app.post('/sponsor/cancel/execute', 'sponsor.cancel.execute', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).execute(); });
    // ↓ログイン不要
    app.all('/sponsor/cancel', 'sponsor.cancel', baseMiddleware, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).index(); });
    app.post('/sponsor/cancel/executeByPaymentNo', 'sponsor.cancel.executeByPaymentNo', baseMiddleware, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).executeByPaymentNo(); });
};
