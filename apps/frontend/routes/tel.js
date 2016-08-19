"use strict";
const TelAuthController_1 = require('../controllers/Tel/Auth/TelAuthController');
const TelMyPageController_1 = require('../controllers/Tel/MyPage/TelMyPageController');
const TelReserveController_1 = require('../controllers/Tel/Reserve/TelReserveController');
const TelCancelController_1 = require('../controllers/Tel/Cancel/TelCancelController');
const TelStaffUser_1 = require('../models/User/TelStaffUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let authentication = (req, res, next) => {
        if (!req.telStaffUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect(`/tel/login?cb=${req.originalUrl}`);
            }
        }
        else {
            // 言語設定
            req.setLocale((req.telStaffUser.get('locale')) ? req.telStaffUser.get('locale') : 'ja');
            next();
        }
    };
    let base = (req, res, next) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.telStaffUser = TelStaffUser_1.default.parse(req.session);
        next();
    };
    // 電話窓口フロー
    app.all('/tel/login', 'tel.mypage.login', base, (req, res, next) => { (new TelAuthController_1.default(req, res, next)).login(); });
    app.all('/tel/logout', 'tel.logout', base, (req, res, next) => { (new TelAuthController_1.default(req, res, next)).logout(); });
    app.all('/tel/mypage', 'tel.mypage', base, authentication, (req, res, next) => { (new TelMyPageController_1.default(req, res, next)).index(); });
    app.get('/tel/mypage/search', 'tel.mypage.search', base, authentication, (req, res, next) => { (new TelMyPageController_1.default(req, res, next)).search(); });
    app.get('/tel/reserve/start', 'tel.reserve.start', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).start(); });
    app.all('/tel/reserve/:token/terms', 'tel.reserve.terms', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).terms(); });
    app.all('/tel/reserve/:token/performances', 'tel.reserve.performances', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).performances(); });
    app.all('/tel/reserve/:token/seats', 'tel.reserve.seats', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).seats(); });
    app.all('/tel/reserve/:token/tickets', 'tel.reserve.tickets', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).tickets(); });
    app.all('/tel/reserve/:token/profile', 'tel.reserve.profile', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).profile(); });
    app.all('/tel/reserve/:token/confirm', 'tel.reserve.confirm', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).confirm(); });
    app.get('/tel/reserve/:paymentNo/complete', 'tel.reserve.complete', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).complete(); });
    app.post('/tel/cancel/execute', 'tel.cancel.execute', base, authentication, (req, res, next) => { (new TelCancelController_1.default(req, res, next)).execute(); });
};
