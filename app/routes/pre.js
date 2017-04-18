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
 * 先行予約ルーター
 *
 * @function preRouter
 * @ignore
 */
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../common/Util/Util");
const PreCustomerAuthController_1 = require("../controllers/PreCustomer/Auth/PreCustomerAuthController");
const PreCustomerReserveController_1 = require("../controllers/PreCustomer/Reserve/PreCustomerReserveController");
const PreCustomerUser_1 = require("../models/User/PreCustomerUser");
exports.default = (app) => {
    const authentication = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        if (req.preCustomerUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }
        // 既ログインの場合
        if (req.preCustomerUser.isAuthenticated()) {
            // 言語設定
            if (req.preCustomerUser.get('locale') !== undefined && req.preCustomerUser.get('locale') !== null) {
                req.setLocale(req.preCustomerUser.get('locale'));
            }
            next();
            return;
        }
        // 自動ログインチェック
        const checkRemember = () => __awaiter(this, void 0, void 0, function* () {
            if (req.cookies.remember_pre_customer === undefined) {
                return null;
            }
            try {
                const authenticationDoc = yield chevre_domain_1.Models.Authentication.findOne({
                    token: req.cookies.remember_pre_customer,
                    pre_customer: { $ne: null }
                }).exec();
                if (authenticationDoc === null) {
                    res.clearCookie('remember_pre_customer');
                    return null;
                }
                // トークン再生成
                const token = Util.createToken();
                yield authenticationDoc.update({ token: token }).exec();
                // tslint:disable-next-line:no-cookies
                res.cookie('remember_pre_customer', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                const preCustomer = yield chevre_domain_1.Models.PreCustomer.findOne({ _id: authenticationDoc.get('pre_customer') }).exec();
                return {
                    preCustomer: preCustomer,
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
            req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME] = userSession.preCustomer.toObject();
            req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME].locale = userSession.locale;
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
                res.redirect(`/pre/login?cb=${req.originalUrl}`);
            }
        }
    });
    // tslint:disable-next-line:variable-name
    const base = (req, _res, next) => {
        req.preCustomerUser = PreCustomerUser_1.default.parse(req.session);
        next();
    };
    // 外部関係者
    // tslint:disable:max-line-length
    app.all('/pre/login', base, (req, res, next) => { (new PreCustomerAuthController_1.default(req, res, next)).login(); });
    app.all('/pre/logout', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerAuthController_1.default(req, res, next)).logout(); }));
    app.get('/pre/reserve/start', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerReserveController_1.default(req, res, next)).start(); }));
    app.all('/pre/reserve/:token/performances', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerReserveController_1.default(req, res, next)).performances(); }));
    app.all('/pre/reserve/:token/seats', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerReserveController_1.default(req, res, next)).seats(); }));
    app.all('/pre/reserve/:token/tickets', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerReserveController_1.default(req, res, next)).tickets(); }));
    app.all('/pre/reserve/:token/profile', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerReserveController_1.default(req, res, next)).profile(); }));
    app.all('/pre/reserve/:token/confirm', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerReserveController_1.default(req, res, next)).confirm(); }));
    app.get('/pre/reserve/:paymentNo/waitingSettlement', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerReserveController_1.default(req, res, next)).waitingSettlement(); }));
    app.get('/pre/reserve/:paymentNo/complete', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new PreCustomerReserveController_1.default(req, res, next)).complete(); }));
};
