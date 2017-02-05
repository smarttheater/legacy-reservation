"use strict";
const TelAuthController_1 = require("../controllers/Tel/Auth/TelAuthController");
const TelMyPageController_1 = require("../controllers/Tel/MyPage/TelMyPageController");
const TelReserveController_1 = require("../controllers/Tel/Reserve/TelReserveController");
const TelCancelController_1 = require("../controllers/Tel/Cancel/TelCancelController");
const Models_1 = require("../../common/models/Models");
const Util_1 = require("../../common/Util/Util");
const TelStaffUser_1 = require("../models/User/TelStaffUser");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let authentication = (req, res, next) => {
        if (!req.telStaffUser.isAuthenticated()) {
            // 自動ログインチェック
            let checkRemember = (cb) => {
                if (req.cookies.remember_tel_staff) {
                    Models_1.default.Authentication.findOne({
                        token: req.cookies.remember_tel_staff,
                        tel_staff: { $ne: null }
                    }, (err, authentication) => {
                        if (authentication) {
                            // トークン再生成
                            let token = Util_1.default.createToken();
                            authentication.update({
                                token: token
                            }, (err, raw) => {
                                if (err)
                                    cb(null);
                                res.cookie('remember_tel_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                Models_1.default.TelStaff.findOne({ _id: authentication.get('tel_staff') }, (err, telStaff) => {
                                    cb(telStaff);
                                });
                            });
                        }
                        else {
                            res.clearCookie('remember_tel_staff');
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
                    req.session[TelStaffUser_1.default.AUTH_SESSION_NAME] = user.toObject();
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
                        res.redirect(`/tel/login?cb=${req.originalUrl}`);
                    }
                }
            });
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
    app.post('/tel/cancel2sagyo/execute', 'tel.cancel2sagyo.execute', base, authentication, (req, res, next) => { (new TelCancelController_1.default(req, res, next)).execute2sagyo(); });
};
