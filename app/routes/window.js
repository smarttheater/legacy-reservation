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
    const authentication = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        if (req.windowUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }
        // 既ログインの場合
        if (req.windowUser.isAuthenticated()) {
            // 言語設定
            if (req.windowUser.get('locale') !== undefined && req.windowUser.get('locale') !== null) {
                req.setLocale(req.windowUser.get('locale'));
            }
            next();
            return;
        }
        // 自動ログインチェック
        const checkRemember = () => __awaiter(this, void 0, void 0, function* () {
            if (req.cookies.remember_window === undefined) {
                return null;
            }
            try {
                const authenticationDoc = yield chevre_domain_1.Models.Authentication.findOne({
                    token: req.cookies.remember_window,
                    window: { $ne: null }
                }).exec();
                if (authenticationDoc === null) {
                    res.clearCookie('remember_window');
                    return null;
                }
                // トークン再生成
                const token = Util.createToken();
                yield authenticationDoc.update({ token: token }).exec();
                // tslint:disable-next-line:no-cookies
                res.cookie('remember_window', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                return yield chevre_domain_1.Models.Window.findOne({ _id: authenticationDoc.get('window') }).exec();
            }
            catch (error) {
                return null;
            }
        });
        const user = yield checkRemember();
        if (user !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[WindowUser_1.default.AUTH_SESSION_NAME] = user.toObject();
            res.redirect(req.originalUrl);
        }
        else {
            if (req.xhr) {
                res.json({ message: 'login required.' });
            }
            else {
                res.redirect(`/window/login?cb=${req.originalUrl}`);
            }
        }
    });
    // tslint:disable-next-line:variable-name
    const base = (req, _res, next) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.windowUser = WindowUser_1.default.parse(req.session);
        next();
    };
    // 当日窓口フロー
    // tslint:disable:max-line-length
    app.all('/window/login', 'window.mypage.login', base, (req, res, next) => { (new WindowAuthController_1.default(req, res, next)).login(); });
    app.all('/window/logout', 'window.logout', base, (req, res, next) => { (new WindowAuthController_1.default(req, res, next)).logout(); });
    app.all('/window/mypage', 'window.mypage', base, authentication, (req, res, next) => { (new WindowMyPageController_1.default(req, res, next)).index(); });
    app.get('/window/mypage/search', 'window.mypage.search', base, authentication, (req, res, next) => { (new WindowMyPageController_1.default(req, res, next)).search(); });
    app.get('/window/reserve/start', 'window.reserve.start', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).start(); });
    app.all('/window/reserve/:token/terms', 'window.reserve.terms', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).terms(); });
    app.all('/window/reserve/:token/performances', 'window.reserve.performances', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).performances(); });
    app.all('/window/reserve/:token/seats', 'window.reserve.seats', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).seats(); });
    app.all('/window/reserve/:token/tickets', 'window.reserve.tickets', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).tickets(); });
    app.all('/window/reserve/:token/profile', 'window.reserve.profile', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).profile(); });
    app.all('/window/reserve/:token/confirm', 'window.reserve.confirm', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).confirm(); });
    app.get('/window/reserve/:paymentNo/complete', 'window.reserve.complete', base, authentication, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).complete(); });
    app.post('/window/cancel/execute', 'window.cancel.execute', base, authentication, (req, res, next) => { (new WindowCancelController_1.default(req, res, next)).execute(); });
};
