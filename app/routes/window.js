"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../common/Util/Util");
const WindowAuthController_1 = require("../controllers/Window/Auth/WindowAuthController");
const WindowCancelController_1 = require("../controllers/Window/Cancel/WindowCancelController");
const WindowMyPageController_1 = require("../controllers/Window/MyPage/WindowMyPageController");
const WindowReserveController_1 = require("../controllers/Window/Reserve/WindowReserveController");
const WindowUser_1 = require("../models/User/WindowUser");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    const authenticationMiddleware = (req, res, next) => {
        if (!req.windowUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb) => {
                if (req.cookies.remember_window) {
                    ttts_domain_1.Models.Authentication.findOne({
                        token: req.cookies.remember_window,
                        window: { $ne: null }
                    }, (err, authentication) => {
                        if (authentication) {
                            // トークン再生成
                            const token = Util_1.default.createToken();
                            authentication.update({
                                token: token
                            }, (updateErr, raw) => {
                                if (updateErr)
                                    cb(null);
                                res.cookie('remember_window', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                ttts_domain_1.Models.Window.findOne({ _id: authentication.get('window') }, (findErr, window) => {
                                    cb(window);
                                });
                            });
                        }
                        else {
                            res.clearCookie('remember_window');
                            cb(null);
                        }
                    });
                }
                else {
                    cb(null);
                }
            };
            checkRemember((user) => {
                if (user) {
                    // ログインしてリダイレクト
                    req.session[WindowUser_1.default.AUTH_SESSION_NAME] = user.toObject();
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
                        res.redirect(`/window/login?cb=${req.originalUrl}`);
                    }
                }
            });
        }
        else {
            // 言語設定
            req.setLocale((req.windowUser.get('locale')) ? req.windowUser.get('locale') : 'ja');
            next();
        }
    };
    const baseMiddleware = (req, res, next) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.windowUser = WindowUser_1.default.parse(req.session);
        next();
    };
    // 当日窓口フロー
    app.all('/window/login', 'window.mypage.login', baseMiddleware, (req, res, next) => { (new WindowAuthController_1.default(req, res, next)).login(); });
    app.all('/window/logout', 'window.logout', baseMiddleware, (req, res, next) => { (new WindowAuthController_1.default(req, res, next)).logout(); });
    app.all('/window/mypage', 'window.mypage', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowMyPageController_1.default(req, res, next)).index(); });
    app.get('/window/mypage/search', 'window.mypage.search', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowMyPageController_1.default(req, res, next)).search(); });
    app.get('/window/reserve/start', 'window.reserve.start', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).start(); });
    app.all('/window/reserve/:token/terms', 'window.reserve.terms', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).terms(); });
    app.all('/window/reserve/:token/performances', 'window.reserve.performances', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).performances(); });
    app.all('/window/reserve/:token/seats', 'window.reserve.seats', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).seats(); });
    app.all('/window/reserve/:token/tickets', 'window.reserve.tickets', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).tickets(); });
    app.all('/window/reserve/:token/profile', 'window.reserve.profile', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).profile(); });
    app.all('/window/reserve/:token/confirm', 'window.reserve.confirm', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).confirm(); });
    app.get('/window/reserve/:paymentNo/complete', 'window.reserve.complete', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).complete(); });
    app.post('/window/cancel/execute', 'window.cancel.execute', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new WindowCancelController_1.default(req, res, next)).execute(); });
};
