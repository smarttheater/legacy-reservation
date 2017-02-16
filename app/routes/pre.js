"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../common/Util/Util");
const PreCustomerAuthController_1 = require("../controllers/PreCustomer/Auth/PreCustomerAuthController");
const PreCustomerReserveController_1 = require("../controllers/PreCustomer/Reserve/PreCustomerReserveController");
const PreCustomerUser_1 = require("../models/User/PreCustomerUser");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    const authenticationMiddleware = (req, res, next) => {
        if (!req.preCustomerUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb) => {
                if (req.cookies.remember_pre_customer) {
                    ttts_domain_1.Models.Authentication.findOne({
                        token: req.cookies.remember_pre_customer,
                        pre_customer: { $ne: null }
                    }, (err, authentication) => {
                        if (authentication) {
                            // トークン再生成
                            const token = Util_1.default.createToken();
                            authentication.update({
                                token: token
                            }, (updateErr, raw) => {
                                if (updateErr)
                                    cb(null, null);
                                res.cookie('remember_pre_customer', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                ttts_domain_1.Models.PreCustomer.findOne({ _id: authentication.get('pre_customer') }, (findErr, preCustomer) => {
                                    cb(preCustomer, authentication.get('locale'));
                                });
                            });
                        }
                        else {
                            res.clearCookie('remember_pre_customer');
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
                    req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME] = user.toObject();
                    req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME].locale = locale;
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
                        res.redirect(`/pre/login?cb=${req.originalUrl}`);
                    }
                }
            });
        }
        else {
            // 言語設定
            req.setLocale((req.preCustomerUser.get('locale')) ? req.preCustomerUser.get('locale') : 'en');
            next();
        }
    };
    const baseMiddleware = (req, res, next) => {
        req.preCustomerUser = PreCustomerUser_1.default.parse(req.session);
        next();
    };
    // 外部関係者
    app.all('/pre/login', 'pre.reserve.terms', baseMiddleware, (req, res, next) => { (new PreCustomerAuthController_1.default(req, res, next)).login(); });
    app.all('/pre/logout', 'pre.logout', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new PreCustomerAuthController_1.default(req, res, next)).logout(); });
    app.get('/pre/reserve/start', 'pre.reserve.start', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).start(); });
    app.all('/pre/reserve/:token/performances', 'pre.reserve.performances', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).performances(); });
    app.all('/pre/reserve/:token/seats', 'pre.reserve.seats', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).seats(); });
    app.all('/pre/reserve/:token/tickets', 'pre.reserve.tickets', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).tickets(); });
    app.all('/pre/reserve/:token/profile', 'pre.reserve.profile', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).profile(); });
    app.all('/pre/reserve/:token/confirm', 'pre.reserve.confirm', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).confirm(); });
    app.get('/pre/reserve/:paymentNo/waitingSettlement', 'pre.reserve.waitingSettlement', baseMiddleware, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/pre/reserve/:paymentNo/complete', 'pre.reserve.complete', baseMiddleware, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).complete(); });
};
