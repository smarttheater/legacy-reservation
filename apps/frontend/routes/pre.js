"use strict";
const PreCustomerAuthController_1 = require("../controllers/PreCustomer/Auth/PreCustomerAuthController");
const PreCustomerReserveController_1 = require("../controllers/PreCustomer/Reserve/PreCustomerReserveController");
const Models_1 = require("../../common/models/Models");
const Util_1 = require("../../common/Util/Util");
const PreCustomerUser_1 = require("../models/User/PreCustomerUser");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let authentication = (req, res, next) => {
        if (!req.preCustomerUser.isAuthenticated()) {
            // 自動ログインチェック
            let checkRemember = (cb) => {
                if (req.cookies.remember_pre_customer) {
                    Models_1.default.Authentication.findOne({
                        token: req.cookies.remember_pre_customer,
                        pre_customer: { $ne: null }
                    }, (err, authentication) => {
                        if (authentication) {
                            // トークン再生成
                            let token = Util_1.default.createToken();
                            authentication.update({
                                token: token
                            }, (err, raw) => {
                                if (err)
                                    cb(null, null);
                                res.cookie('remember_pre_customer', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                Models_1.default.PreCustomer.findOne({ _id: authentication.get('pre_customer') }, (err, preCustomer) => {
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
                    req.session[PreCustomerUser_1.default.AUTH_SESSION_NAME]['locale'] = locale;
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
    let base = (req, res, next) => {
        req.preCustomerUser = PreCustomerUser_1.default.parse(req.session);
        next();
    };
    // 外部関係者
    app.all('/pre/login', 'pre.reserve.terms', base, (req, res, next) => { (new PreCustomerAuthController_1.default(req, res, next)).login(); });
    app.all('/pre/logout', 'pre.logout', base, authentication, (req, res, next) => { (new PreCustomerAuthController_1.default(req, res, next)).logout(); });
    app.get('/pre/reserve/start', 'pre.reserve.start', base, authentication, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).start(); });
    app.all('/pre/reserve/:token/performances', 'pre.reserve.performances', base, authentication, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).performances(); });
    app.all('/pre/reserve/:token/seats', 'pre.reserve.seats', base, authentication, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).seats(); });
    app.all('/pre/reserve/:token/tickets', 'pre.reserve.tickets', base, authentication, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).tickets(); });
    app.all('/pre/reserve/:token/profile', 'pre.reserve.profile', base, authentication, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).profile(); });
    app.all('/pre/reserve/:token/confirm', 'pre.reserve.confirm', base, authentication, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).confirm(); });
    app.get('/pre/reserve/:paymentNo/waitingSettlement', 'pre.reserve.waitingSettlement', base, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/pre/reserve/:paymentNo/complete', 'pre.reserve.complete', base, (req, res, next) => { (new PreCustomerReserveController_1.default(req, res, next)).complete(); });
};
