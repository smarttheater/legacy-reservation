"use strict";
var NamedRoutes = require('named-routes');
var AdmissionController_1 = require('../controllers/Admission/AdmissionController');
var CustomerReserveController_1 = require('../controllers/Customer/Reserve/CustomerReserveController');
var MemberReserveController_1 = require('../controllers/Member/Reserve/MemberReserveController');
var GMOReserveController_1 = require('../controllers/GMO/Reserve/GMOReserveController');
var ReserveController_1 = require('../controllers/Reserve/ReserveController');
var LanguageController_1 = require('../controllers/Language/LanguageController');
var StaffAuthController_1 = require('../controllers/Staff/Auth/StaffAuthController');
var StaffCancelController_1 = require('../controllers/Staff/Cancel/StaffCancelController');
var StaffMyPageController_1 = require('../controllers/Staff/MyPage/StaffMyPageController');
var StaffReserveController_1 = require('../controllers/Staff/Reserve/StaffReserveController');
var SponsorAuthController_1 = require('../controllers/Sponsor/Auth/SponsorAuthController');
var SponsorMyPageController_1 = require('../controllers/Sponsor/MyPage/SponsorMyPageController');
var SponsorReserveController_1 = require('../controllers/Sponsor/Reserve/SponsorReserveController');
var SponsorCancelController_1 = require('../controllers/Sponsor/Cancel/SponsorCancelController');
var ErrorController_1 = require('../controllers/Error/ErrorController');
var IndexController_1 = require('../controllers/Index/IndexController');
var MemberUser_1 = require('../models/User/MemberUser');
var StaffUser_1 = require('../models/User/StaffUser');
var SponsorUser_1 = require('../models/User/SponsorUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = function (app) {
    var router = new NamedRoutes();
    router.extendExpress(app);
    router.registerAppHelpers(app);
    app.get('/', 'Home', function (req, res, next) { (new IndexController_1.default(req, res, next)).index(); });
    // 言語
    app.get('/language/update/:locale', 'language.update', function (req, res, next) { (new LanguageController_1.default(req, res, next)).update(); });
    app.get('/reserve/:token/getSeatProperties', 'reserve.getSeatProperties', function (req, res, next) { (new ReserveController_1.default(req, res, next)).getSeatProperties(); });
    app.get('/reserve/:token/:reservationId/barcode', 'reserve.barcode', function (req, res, next) { (new ReserveController_1.default(req, res, next)).barcode(); });
    app.get('/reserve/:token/:reservationId/qrcode', 'reserve.qrcode', function (req, res, next) { (new ReserveController_1.default(req, res, next)).qrcode(); });
    // GMOプロセス
    app.get('/GMO/reserve/:token/start', 'gmo.reserve.start', function (req, res, next) { (new GMOReserveController_1.default(req, res, next)).start(); });
    app.post('/GMO/reserve/result', 'gmo.reserve.result', function (req, res, next) { (new GMOReserveController_1.default(req, res, next)).result(); });
    app.all('/GMO/reserve/notify', 'gmo.reserve.notify', function (req, res, next) { (new GMOReserveController_1.default(req, res, next)).notify(); });
    // 一般
    app.all('/customer/reserve/performances', 'customer.reserve.performances', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).performances(); });
    app.post('/customer/reserve/start', 'customer.reserve.start', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).start(); });
    app.all('/customer/reserve/:token/terms', 'customer.reserve.terms', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).terms(); });
    app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).seats(); });
    app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).tickets(); });
    app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).profile(); });
    app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).confirm(); });
    app.get('/customer/reserve/:token/waitingSettlement', 'customer.reserve.waitingSettlement', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/customer/reserve/:token/complete', 'customer.reserve.complete', function (req, res, next) { (new CustomerReserveController_1.default(req, res, next)).complete(); });
    // admission
    app.get('/admission/performances', 'admission.performances', function (req, res, next) { (new AdmissionController_1.default(req, res, next)).performances(); });
    app.get('/admission/performance/:id/confirm', 'admission.confirm', function (req, res, next) { (new AdmissionController_1.default(req, res, next)).confirm(); });
    var authenticationMember = function (req, res, next) {
        var memberUser = MemberUser_1.default.getInstance();
        if (!memberUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect('/member/reserve/terms');
            }
        }
        else {
            next();
        }
    };
    var authenticationStaff = function (req, res, next) {
        var staffUser = StaffUser_1.default.getInstance();
        if (!staffUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect('/staff/login');
            }
        }
        else {
            next();
        }
    };
    var authenticationSponsor = function (req, res, next) {
        var sponsorUser = SponsorUser_1.default.getInstance();
        if (!sponsorUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect('/sponsor/login');
            }
        }
        else {
            next();
        }
    };
    // メルマガ先行
    app.all('/member/reserve/terms', 'member.reserve.terms', function (req, res, next) { (new MemberReserveController_1.default(req, res, next)).terms(); });
    app.get('/member/reserve/start', 'member.reserve.start', function (req, res, next) { (new MemberReserveController_1.default(req, res, next)).start(); });
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', authenticationMember, function (req, res, next) { (new MemberReserveController_1.default(req, res, next)).tickets(); });
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', authenticationMember, function (req, res, next) { (new MemberReserveController_1.default(req, res, next)).profile(); });
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', authenticationMember, function (req, res, next) { (new MemberReserveController_1.default(req, res, next)).confirm(); });
    app.get('/member/reserve/:token/waitingSettlement', 'member.reserve.waitingSettlement', authenticationMember, function (req, res, next) { (new MemberReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/member/reserve/:token/complete', 'member.reserve.complete', authenticationMember, function (req, res, next) { (new MemberReserveController_1.default(req, res, next)).complete(); });
    // TODO admin権限フロー
    var staffBase = function (req, res, next) {
        req.setLocale('en');
        next();
    };
    // 内部関係者
    app.all('/staff/login', 'staff.login', staffBase, function (req, res, next) { (new StaffAuthController_1.default(req, res, next)).login(); });
    app.all('/staff/logout', 'staff.logout', staffBase, function (req, res, next) { (new StaffAuthController_1.default(req, res, next)).logout(); });
    app.all('/staff/mypage', 'staff.mypage', staffBase, authenticationStaff, function (req, res, next) { (new StaffMyPageController_1.default(req, res, next)).index(); });
    app.get('/staff/mypage/search', 'staff.mypage.search', staffBase, authenticationStaff, function (req, res, next) { (new StaffMyPageController_1.default(req, res, next)).search(); });
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', staffBase, authenticationStaff, function (req, res, next) { (new StaffMyPageController_1.default(req, res, next)).updateWatcherName(); });
    app.get('/staff/reserve/start', 'staff.reserve.start', staffBase, authenticationStaff, function (req, res, next) { (new StaffReserveController_1.default(req, res, next)).start(); });
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', staffBase, authenticationStaff, function (req, res, next) { (new StaffReserveController_1.default(req, res, next)).performances(); });
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', staffBase, authenticationStaff, function (req, res, next) { (new StaffReserveController_1.default(req, res, next)).seats(); });
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', staffBase, authenticationStaff, function (req, res, next) { (new StaffReserveController_1.default(req, res, next)).tickets(); });
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', staffBase, authenticationStaff, function (req, res, next) { (new StaffReserveController_1.default(req, res, next)).confirm(); });
    app.get('/staff/reserve/:token/process', 'staff.reserve.process', staffBase, authenticationStaff, function (req, res, next) { (new StaffReserveController_1.default(req, res, next)).process(); });
    app.get('/staff/reserve/:token/complete', 'staff.reserve.complete', staffBase, authenticationStaff, function (req, res, next) { (new StaffReserveController_1.default(req, res, next)).complete(); });
    app.post('/staff/cancel/execute', 'staff.cancel.execute', staffBase, authenticationStaff, function (req, res, next) { (new StaffCancelController_1.default(req, res, next)).execute(); });
    var sponsorBase = function (req, res, next) {
        req.setLocale('en');
        next();
    };
    // 外部関係者
    // TODO キャンセルするためだけのフォームページ
    app.all('/sponsor/login', 'sponsor.login', sponsorBase, function (req, res, next) { (new SponsorAuthController_1.default(req, res, next)).login(); });
    app.all('/sponsor/logout', 'sponsor.logout', sponsorBase, function (req, res, next) { (new SponsorAuthController_1.default(req, res, next)).logout(); });
    app.all('/sponsor/mypage', 'sponsor.mypage', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorMyPageController_1.default(req, res, next)).index(); });
    app.get('/sponsor/reserve/start', 'sponsor.reserve.start', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorReserveController_1.default(req, res, next)).start(); });
    app.all('/sponsor/reserve/:token/performances', 'sponsor.reserve.performances', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorReserveController_1.default(req, res, next)).performances(); });
    app.all('/sponsor/reserve/:token/seats', 'sponsor.reserve.seats', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorReserveController_1.default(req, res, next)).seats(); });
    app.all('/sponsor/reserve/:token/tickets', 'sponsor.reserve.tickets', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorReserveController_1.default(req, res, next)).tickets(); });
    app.all('/sponsor/reserve/:token/profile', 'sponsor.reserve.profile', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorReserveController_1.default(req, res, next)).profile(); });
    app.all('/sponsor/reserve/:token/confirm', 'sponsor.reserve.confirm', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorReserveController_1.default(req, res, next)).confirm(); });
    app.get('/sponsor/reserve/:token/process', 'sponsor.reserve.process', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorReserveController_1.default(req, res, next)).process(); });
    app.get('/sponsor/reserve/:token/complete', 'sponsor.reserve.complete', sponsorBase, authenticationSponsor, function (req, res, next) { (new SponsorReserveController_1.default(req, res, next)).complete(); });
    app.post('/sponsor/cancel/execute', 'sponsor.cancel.execute', authenticationSponsor, sponsorBase, function (req, res, next) { (new SponsorCancelController_1.default(req, res, next)).execute(); });
    // TODO 当日窓口フロー
    // 当日の場合、スケジュール選択候補は、検索条件通り全て出す
    // 検索条件の初期値を、上映日：当日にする
    // 4席制限
    // TODO 電話窓口フロー
    app.get('/Error/NotFound', 'Error.NotFound', function (req, res, next) { (new ErrorController_1.default(req, res, next)).notFound(); });
    // 404
    app.use(function (req, res, next) {
        return res.redirect('/Error/NotFound');
    });
    // error handlers
    app.use(function (err, req, res, next) {
        (new ErrorController_1.default(req, res, next)).index(err);
    });
};
