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
/**
 * 当日窓口ルーター
 *
 * @function windowRouter
 * @ignore
 */
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../common/Util/Util");
const WindowAuthController_1 = require("../controllers/Window/Auth/WindowAuthController");
const WindowCancelController_1 = require("../controllers/Window/Cancel/WindowCancelController");
const WindowMyPageController_1 = require("../controllers/Window/MyPage/WindowMyPageController");
const WindowReserveController_1 = require("../controllers/Window/Reserve/WindowReserveController");
const WindowUser_1 = require("../models/User/WindowUser");
exports.default = (app) => {
    const authenticationMiddleware = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        if (req.windowUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }
        if (!req.windowUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb) => __awaiter(this, void 0, void 0, function* () {
                if (req.cookies.remember_window !== undefined) {
                    try {
                        const authentication = yield chevre_domain_1.Models.Authentication.findOne({
                            token: req.cookies.remember_window,
                            window: { $ne: null }
                        }).exec();
                        if (authentication === null) {
                            res.clearCookie('remember_window');
                            cb(null);
                            return;
                        }
                        // トークン再生成
                        const token = Util.createToken();
                        yield authentication.update({
                            token: token
                        }).exec();
                        // tslint:disable-next-line:no-cookies
                        res.cookie('remember_window', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                        const window = yield chevre_domain_1.Models.Window.findOne({ _id: authentication.get('window') }).exec();
                        cb(window);
                    }
                    catch (error) {
                        cb(null);
                        return;
                    }
                }
                else {
                    cb(null);
                }
            });
            yield checkRemember((user) => {
                if (user !== null && req.session !== undefined) {
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
            if (req.windowUser.get('locale') !== undefined && req.windowUser.get('locale') !== null) {
                req.setLocale(req.windowUser.get('locale'));
            }
            next();
        }
    });
    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req, _res, next) => {
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
