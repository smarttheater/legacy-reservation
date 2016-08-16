"use strict";
const WindowAuthController_1 = require('../controllers/Window/Auth/WindowAuthController');
const WindowMyPageController_1 = require('../controllers/Window/MyPage/WindowMyPageController');
const WindowReserveController_1 = require('../controllers/Window/Reserve/WindowReserveController');
const WindowCancelController_1 = require('../controllers/Window/Cancel/WindowCancelController');
const WindowUser_1 = require('../models/User/WindowUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let authentication = (req, res, next) => {
        if (!req.windowUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect(`/window/login?cb=${req.originalUrl}`);
            }
        }
        else {
            // 言語設定
            req.setLocale((req.windowUser.get('locale')) ? req.windowUser.get('locale') : 'ja');
            next();
        }
    };
    let base = (req, res, next) => {
        req.windowUser = WindowUser_1.default.parse(req.session);
        next();
    };
    // 当日窓口フロー
    app.all('/window/login', 'window.mypage.login', base, (req, res, next) => { (new WindowAuthController_1.default(req, res, next)).login(); });
    app.all('/window/logout', 'window.logout', base, (req, res, next) => { (new WindowAuthController_1.default(req, res, next)).logout(); });
    app.all('/window/mypage', 'window.mypage', base, authentication, (req, res, next) => { (new WindowMyPageController_1.default(req, res, next)).index(); });
    app.get('/window/mypage/search', 'window.mypage.search', base, authentication, (req, res, next) => { (new WindowMyPageController_1.default(req, res, next)).search(); });
    app.get('/window/reserve/start', 'window.reserve.start', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).start(); });
    app.all('/window/reserve/:token/performances', 'window.reserve.performances', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).performances(); });
    app.all('/window/reserve/:token/seats', 'window.reserve.seats', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).seats(); });
    app.all('/window/reserve/:token/tickets', 'window.reserve.tickets', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).tickets(); });
    app.all('/window/reserve/:token/profile', 'window.reserve.profile', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).profile(); });
    app.all('/window/reserve/:token/confirm', 'window.reserve.confirm', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).confirm(); });
    app.get('/window/reserve/:paymentNo/complete', 'window.reserve.complete', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).complete(); });
    app.post('/window/cancel/execute', 'window.cancel.execute', base, authentication, (req, res, next) => { (new WindowCancelController_1.default(req, res, next)).execute(); });
};
