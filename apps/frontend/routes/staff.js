"use strict";
const StaffAuthController_1 = require('../controllers/Staff/Auth/StaffAuthController');
const StaffCancelController_1 = require('../controllers/Staff/Cancel/StaffCancelController');
const StaffMyPageController_1 = require('../controllers/Staff/MyPage/StaffMyPageController');
const StaffReserveController_1 = require('../controllers/Staff/Reserve/StaffReserveController');
const StaffUser_1 = require('../models/User/StaffUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let authentication = (req, res, next) => {
        if (!req.staffUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect(`/staff/login?cb=${req.originalUrl}`);
            }
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
    // TODO admin権限フロー
    // 内部関係者
    app.all('/staff/login', 'staff.mypage.login', base, (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).login(); });
    app.all('/staff/logout', 'staff.logout', base, (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).logout(); });
    app.all('/staff/mypage', 'staff.mypage', base, authentication, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).index(); });
    app.get('/staff/mypage/search', 'staff.mypage.search', base, authentication, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).search(); });
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', base, authentication, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).updateWatcherName(); });
    app.get('/staff/reserve/start', 'staff.reserve.start', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).start(); });
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).performances(); });
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).seats(); });
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).tickets(); });
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).confirm(); });
    app.get('/staff/reserve/:paymentNo/complete', 'staff.reserve.complete', base, authentication, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).complete(); });
    app.post('/staff/cancel/execute', 'staff.cancel.execute', base, authentication, (req, res, next) => { (new StaffCancelController_1.default(req, res, next)).execute(); });
    // TODO 座席開放
};
