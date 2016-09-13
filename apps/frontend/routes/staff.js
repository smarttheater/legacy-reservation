"use strict";
const StaffAuthController_1 = require("../controllers/Staff/Auth/StaffAuthController");
const StaffCancelController_1 = require("../controllers/Staff/Cancel/StaffCancelController");
const StaffMyPageController_1 = require("../controllers/Staff/MyPage/StaffMyPageController");
const StaffReserveController_1 = require("../controllers/Staff/Reserve/StaffReserveController");
const Models_1 = require("../../common/models/Models");
const Util_1 = require("../../common/Util/Util");
const StaffUser_1 = require("../models/User/StaffUser");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let authentication = (req, res, next) => {
        if (!req.staffUser.isAuthenticated()) {
            // 自動ログインチェック
            let checkRemember = (cb) => {
                if (req.cookies.remember_staff) {
                    Models_1.default.Authentication.findOne({
                        token: req.cookies.remember_staff,
                        staff: { $ne: null }
                    }, (err, authentication) => {
                        if (authentication) {
                            // トークン再生成
                            let token = Util_1.default.createToken();
                            authentication.update({
                                token: token
                            }, (err, raw) => {
                                if (err)
                                    cb(null, null, null);
                                res.cookie('remember_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                Models_1.default.Staff.findOne({ _id: authentication.get('staff') }, (err, staff) => {
                                    cb(staff, authentication.get('signature'), authentication.get('locale'));
                                });
                            });
                        }
                        else {
                            res.clearCookie('remember_staff');
                            cb(null, null, null);
                        }
                    });
                }
                else {
                    cb(null, null, null);
                }
            };
            checkRemember((user, signature, locale) => {
                if (user) {
                    // ログインしてリダイレクト
                    req.session[StaffUser_1.default.AUTH_SESSION_NAME] = user.toObject();
                    req.session[StaffUser_1.default.AUTH_SESSION_NAME]['signature'] = signature;
                    req.session[StaffUser_1.default.AUTH_SESSION_NAME]['locale'] = locale;
                    // if exist parameter cb, redirect to cb.
                    res.redirect(req.originalUrl);
                }
                else {
                    if (req.xhr) {
                        res.json({
                            success: false,
                            message: 'login required.'
                        });
                    }
                    else {
                        res.redirect(`/staff/login?cb=${req.originalUrl}`);
                    }
                }
            });
        }
        else {
            // 言語設定
            req.setLocale((req.staffUser.get('locale')) ? req.staffUser.get('locale') : 'en');
            next();
        }
    };
    let base = (req, res, next) => {
        req.staffUser = StaffUser_1.default.parse(req.session);
        next();
    };
    // 内部関係者
    app.all('/staff/login', 'staff.mypage.login', base, (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).login(); });
    app.all('/staff/logout', 'staff.logout', base, (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).logout(); });
    app.all('/staff/mypage', 'staff.mypage', base, authentication, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).index(); });
    app.get('/staff/mypage/search', 'staff.mypage.search', base, authentication, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).search(); });
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', base, authentication, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).updateWatcherName(); });
    app.get('/staff/reserve/start', 'staff.reserve.start', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).start(); });
    app.all('/staff/reserve/:token/terms', 'staff.reserve.terms', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).terms(); });
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).performances(); });
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).seats(); });
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).tickets(); });
    app.all('/staff/reserve/:token/profile', 'staff.reserve.profile', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).profile(); });
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).confirm(); });
    app.get('/staff/reserve/:paymentNo/complete', 'staff.reserve.complete', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).complete(); });
    app.post('/staff/cancel/execute', 'staff.cancel.execute', base, authentication, (req, res, next) => { (new StaffCancelController_1.default(req, res, next)).execute(); });
    app.all('/staff/mypage/release', 'staff.mypage.release', base, authentication, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).release(); });
};
