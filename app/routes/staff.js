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
 * 内部関係者ルーター
 *
 * @function staffRouter
 * @ignore
 */
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const staffAuthController = require("../controllers/staff/auth");
const staffCancelController = require("../controllers/staff/cancel");
const staffMyPageController = require("../controllers/staff/mypage");
const reserve_1 = require("../controllers/staff/reserve");
const staff_1 = require("../models/user/staff");
exports.default = (app) => {
    const authentication = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        if (req.staffUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }
        // 既ログインの場合
        if (req.staffUser.isAuthenticated()) {
            // 言語設定
            if (req.staffUser.get('locale') !== undefined && req.staffUser.get('locale') !== null) {
                req.setLocale(req.staffUser.get('locale'));
            }
            next();
            return;
        }
        // 自動ログインチェック
        const checkRemember = () => __awaiter(this, void 0, void 0, function* () {
            if (req.cookies.remember_staff === undefined) {
                return null;
            }
            try {
                const authenticationDoc = yield chevre_domain_1.Models.Authentication.findOne({
                    token: req.cookies.remember_staff,
                    staff: { $ne: null }
                }).exec();
                if (authenticationDoc === null) {
                    res.clearCookie('remember_staff');
                    return null;
                }
                // トークン再生成
                const token = chevre_domain_1.CommonUtil.createToken();
                yield authenticationDoc.update({ token: token }).exec();
                // tslint:disable-next-line:no-cookies
                res.cookie('remember_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                const staff = yield chevre_domain_1.Models.Staff.findOne({ _id: authenticationDoc.get('staff') }).exec();
                return {
                    staff: staff,
                    signature: authenticationDoc.get('signature'),
                    locale: authenticationDoc.get('locale')
                };
            }
            catch (error) {
                return null;
            }
        });
        const userSession = yield checkRemember();
        if (userSession !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[staff_1.default.AUTH_SESSION_NAME] = userSession.staff.toObject();
            req.session[staff_1.default.AUTH_SESSION_NAME].signature = userSession.signature;
            req.session[staff_1.default.AUTH_SESSION_NAME].locale = userSession.locale;
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
                res.redirect(`/staff/login?cb=${req.originalUrl}`);
            }
        }
    });
    // tslint:disable-next-line:variable-name
    const base = (req, _res, next) => {
        req.staffUser = staff_1.default.parse(req.session);
        next();
    };
    // 内部関係者
    // tslint:disable:max-line-length
    app.all('/staff/login', base, staffAuthController.login);
    app.all('/staff/logout', base, staffAuthController.logout);
    app.all('/staff/mypage', base, authentication, staffMyPageController.index);
    app.get('/staff/mypage/search', base, authentication, staffMyPageController.search);
    app.post('/staff/mypage/updateWatcherName', base, authentication, staffMyPageController.updateWatcherName);
    app.get('/staff/reserve/start', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).start(); }));
    app.all('/staff/reserve/:token/terms', base, authentication, (req, res, next) => { (new reserve_1.default(req, res, next)).terms(); });
    app.all('/staff/reserve/:token/performances', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).performances(); }));
    app.all('/staff/reserve/:token/seats', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).seats(); }));
    app.all('/staff/reserve/:token/tickets', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).tickets(); }));
    app.all('/staff/reserve/:token/profile', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).profile(); }));
    app.all('/staff/reserve/:token/confirm', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).confirm(); }));
    app.get('/staff/reserve/:performanceDay/:paymentNo/complete', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).complete(); }));
    app.post('/staff/cancel/execute', base, authentication, staffCancelController.execute);
    app.all('/staff/mypage/release', base, authentication, staffMyPageController.release);
};
