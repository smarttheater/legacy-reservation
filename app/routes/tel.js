"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../common/Util/Util");
const TelAuthController_1 = require("../controllers/Tel/Auth/TelAuthController");
const TelCancelController_1 = require("../controllers/Tel/Cancel/TelCancelController");
const TelMyPageController_1 = require("../controllers/Tel/MyPage/TelMyPageController");
const TelReserveController_1 = require("../controllers/Tel/Reserve/TelReserveController");
const TelStaffUser_1 = require("../models/User/TelStaffUser");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    const authenticationMiddleware = (req, res, next) => {
        if (!req.telStaffUser)
            return next(new Error(req.__('Message.UnexpectedError')));
        if (!req.telStaffUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb) => {
                if (req.cookies.remember_tel_staff) {
                    ttts_domain_1.Models.Authentication.findOne({
                        token: req.cookies.remember_tel_staff,
                        tel_staff: { $ne: null }
                    }, (err, authentication) => {
                        if (err)
                            return cb(null);
                        if (authentication) {
                            // トークン再生成
                            const token = Util_1.default.createToken();
                            authentication.update({
                                token: token
                            }, (updateRrr) => {
                                if (updateRrr)
                                    return cb(null);
                                res.cookie('remember_tel_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                ttts_domain_1.Models.TelStaff.findOne({ _id: authentication.get('tel_staff') }, (findErr, telStaff) => {
                                    (findErr) ? cb(null) : cb(telStaff);
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
                if (user && req.session) {
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
    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req, _res, next) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.telStaffUser = TelStaffUser_1.default.parse(req.session);
        next();
    };
    // 電話窓口フロー
    app.all('/tel/login', 'tel.mypage.login', baseMiddleware, (req, res, next) => { (new TelAuthController_1.default(req, res, next)).login(); });
    app.all('/tel/logout', 'tel.logout', baseMiddleware, (req, res, next) => { (new TelAuthController_1.default(req, res, next)).logout(); });
    app.all('/tel/mypage', 'tel.mypage', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelMyPageController_1.default(req, res, next)).index(); });
    app.get('/tel/mypage/search', 'tel.mypage.search', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelMyPageController_1.default(req, res, next)).search(); });
    app.get('/tel/reserve/start', 'tel.reserve.start', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).start(); });
    app.all('/tel/reserve/:token/terms', 'tel.reserve.terms', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).terms(); });
    app.all('/tel/reserve/:token/performances', 'tel.reserve.performances', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).performances(); });
    app.all('/tel/reserve/:token/seats', 'tel.reserve.seats', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).seats(); });
    app.all('/tel/reserve/:token/tickets', 'tel.reserve.tickets', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).tickets(); });
    app.all('/tel/reserve/:token/profile', 'tel.reserve.profile', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).profile(); });
    app.all('/tel/reserve/:token/confirm', 'tel.reserve.confirm', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).confirm(); });
    app.get('/tel/reserve/:paymentNo/complete', 'tel.reserve.complete', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).complete(); });
    app.post('/tel/cancel/execute', 'tel.cancel.execute', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelCancelController_1.default(req, res, next)).execute(); });
    app.post('/tel/cancel2sagyo/execute', 'tel.cancel2sagyo.execute', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new TelCancelController_1.default(req, res, next)).execute2sagyo(); });
};
