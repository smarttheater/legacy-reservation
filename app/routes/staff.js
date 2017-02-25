"use strict";
/**
 * 内部関係者ルーター
 *
 * @function staffRouter
 * @ignore
 */
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../common/Util/Util");
const StaffAuthController_1 = require("../controllers/Staff/Auth/StaffAuthController");
const StaffCancelController_1 = require("../controllers/Staff/Cancel/StaffCancelController");
const StaffMyPageController_1 = require("../controllers/Staff/MyPage/StaffMyPageController");
const StaffReserveController_1 = require("../controllers/Staff/Reserve/StaffReserveController");
const StaffUser_1 = require("../models/User/StaffUser");
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    const authenticationMiddleware = (req, res, next) => {
        if (!req.staffUser)
            return next(new Error(req.__('Message.UnexpectedError')));
        if (!req.staffUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb) => {
                if (req.cookies.remember_staff) {
                    chevre_domain_1.Models.Authentication.findOne({
                        token: req.cookies.remember_staff,
                        staff: { $ne: null }
                    }, (err, authentication) => {
                        if (err)
                            return cb(null, null, null);
                        if (authentication) {
                            // トークン再生成
                            const token = Util.createToken();
                            authentication.update({
                                token: token
                            }, (updateErr) => {
                                if (updateErr)
                                    return cb(null, null, null);
                                res.cookie('remember_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                chevre_domain_1.Models.Staff.findOne({ _id: authentication.get('staff') }, (findErr, staff) => {
                                    (findErr) ? cb(null, null, null) : cb(staff, authentication.get('signature'), authentication.get('locale'));
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
                if (user && req.session) {
                    // ログインしてリダイレクト
                    req.session[StaffUser_1.default.AUTH_SESSION_NAME] = user.toObject();
                    req.session[StaffUser_1.default.AUTH_SESSION_NAME].signature = signature;
                    req.session[StaffUser_1.default.AUTH_SESSION_NAME].locale = locale;
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
    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req, _res, next) => {
        req.staffUser = StaffUser_1.default.parse(req.session);
        next();
    };
    // 内部関係者
    app.all('/staff/login', 'staff.mypage.login', baseMiddleware, (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).login(); });
    app.all('/staff/logout', 'staff.logout', baseMiddleware, (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).logout(); });
    app.all('/staff/mypage', 'staff.mypage', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).index(); });
    app.get('/staff/mypage/search', 'staff.mypage.search', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).search(); });
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).updateWatcherName(); });
    app.get('/staff/reserve/start', 'staff.reserve.start', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).start(); });
    app.all('/staff/reserve/:token/terms', 'staff.reserve.terms', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).terms(); });
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).performances(); });
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).seats(); });
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).tickets(); });
    app.all('/staff/reserve/:token/profile', 'staff.reserve.profile', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).profile(); });
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).confirm(); });
    app.get('/staff/reserve/:paymentNo/complete', 'staff.reserve.complete', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).complete(); });
    app.post('/staff/cancel/execute', 'staff.cancel.execute', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffCancelController_1.default(req, res, next)).execute(); });
    app.all('/staff/mypage/release', 'staff.mypage.release', baseMiddleware, authenticationMiddleware, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).release(); });
};
