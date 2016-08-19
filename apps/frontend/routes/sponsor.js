"use strict";
const SponsorAuthController_1 = require('../controllers/Sponsor/Auth/SponsorAuthController');
const SponsorMyPageController_1 = require('../controllers/Sponsor/MyPage/SponsorMyPageController');
const SponsorReserveController_1 = require('../controllers/Sponsor/Reserve/SponsorReserveController');
const SponsorCancelController_1 = require('../controllers/Sponsor/Cancel/SponsorCancelController');
const SponsorUser_1 = require('../models/User/SponsorUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let authentication = (req, res, next) => {
        if (!req.sponsorUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect(`/sponsor/login?cb=${req.originalUrl}`);
            }
        }
        else {
            // 言語設定
            req.setLocale((req.sponsorUser.get('locale')) ? req.sponsorUser.get('locale') : 'en');
            next();
        }
    };
    let base = (req, res, next) => {
        req.sponsorUser = SponsorUser_1.default.parse(req.session);
        next();
    };
    // 外部関係者
    app.all('/sponsor/login', 'sponsor.mypage.login', base, (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).login(); });
    app.all('/sponsor/logout', 'sponsor.logout', base, authentication, (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).logout(); });
    app.all('/sponsor/mypage', 'sponsor.mypage', base, authentication, (req, res, next) => { (new SponsorMyPageController_1.default(req, res, next)).index(); });
    app.get('/sponsor/mypage/search', 'sponsor.mypage.search', base, authentication, (req, res, next) => { (new SponsorMyPageController_1.default(req, res, next)).search(); });
    app.get('/sponsor/reserve/start', 'sponsor.reserve.start', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).start(); });
    app.all('/sponsor/reserve/:token/terms', 'sponsor.reserve.terms', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).terms(); });
    app.all('/sponsor/reserve/:token/performances', 'sponsor.reserve.performances', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).performances(); });
    app.all('/sponsor/reserve/:token/seats', 'sponsor.reserve.seats', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).seats(); });
    app.all('/sponsor/reserve/:token/tickets', 'sponsor.reserve.tickets', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).tickets(); });
    app.all('/sponsor/reserve/:token/profile', 'sponsor.reserve.profile', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).profile(); });
    app.all('/sponsor/reserve/:token/confirm', 'sponsor.reserve.confirm', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).confirm(); });
    app.get('/sponsor/reserve/:paymentNo/complete', 'sponsor.reserve.complete', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).complete(); });
    app.post('/sponsor/cancel/execute', 'sponsor.cancel.execute', base, authentication, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).execute(); });
    // ↓ログイン不要
    app.all('/sponsor/cancel', 'sponsor.cancel', base, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).index(); });
    app.post('/sponsor/cancel/executeByPaymentNo', 'sponsor.cancel.executeByPaymentNo', base, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).executeByPaymentNo(); });
};
