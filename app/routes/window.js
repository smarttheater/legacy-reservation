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
const auth_1 = require("../controllers/window/auth");
const cancel_1 = require("../controllers/window/cancel");
const mypage_1 = require("../controllers/window/mypage");
const reserve_1 = require("../controllers/window/reserve");
const window_1 = require("../models/user/window");
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
                const token = chevre_domain_1.CommonUtil.createToken();
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
            req.session[window_1.default.AUTH_SESSION_NAME] = user.toObject();
            res.redirect(req.originalUrl);
        }
        else {
            if (req.xhr) {
                res.json({
                    success: false,
                    message: 'login required'
                });
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
        req.windowUser = window_1.default.parse(req.session);
        next();
    };
    // 当日窓口フロー
    // tslint:disable:max-line-length
    app.all('/window/login', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new auth_1.default(req, res, next)).login(); }));
    app.all('/window/logout', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new auth_1.default(req, res, next)).logout(); }));
    app.all('/window/mypage', base, authentication, (req, res, next) => { (new mypage_1.default(req, res, next)).index(); });
    app.get('/window/mypage/search', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new mypage_1.default(req, res, next)).search(); }));
    app.get('/window/reserve/start', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).start(); }));
    app.all('/window/reserve/:token/terms', base, authentication, (req, res, next) => { (new reserve_1.default(req, res, next)).terms(); });
    app.all('/window/reserve/:token/performances', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).performances(); }));
    app.all('/window/reserve/:token/seats', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).seats(); }));
    app.all('/window/reserve/:token/tickets', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).tickets(); }));
    app.all('/window/reserve/:token/profile', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).profile(); }));
    app.all('/window/reserve/:token/confirm', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).confirm(); }));
    app.get('/window/reserve/:performanceDay/:paymentNo/complete', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).complete(); }));
    app.post('/window/cancel/execute', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new cancel_1.default(req, res, next)).execute(); }));
};
