"use strict";
const NamedRoutes = require('named-routes');
const AdmissionController_1 = require('../controllers/Admission/AdmissionController');
const MemberReserveController_1 = require('../controllers/Member/Reserve/MemberReserveController');
const GMOReserveController_1 = require('../controllers/GMO/Reserve/GMOReserveController');
const ReserveController_1 = require('../controllers/Reserve/ReserveController');
const LanguageController_1 = require('../controllers/Language/LanguageController');
const CustomerAuthController_1 = require('../controllers/Customer/Auth/CustomerAuthController');
const CustomerReserveController_1 = require('../controllers/Customer/Reserve/CustomerReserveController');
const StaffAuthController_1 = require('../controllers/Staff/Auth/StaffAuthController');
const StaffCancelController_1 = require('../controllers/Staff/Cancel/StaffCancelController');
const StaffMyPageController_1 = require('../controllers/Staff/MyPage/StaffMyPageController');
const StaffReserveController_1 = require('../controllers/Staff/Reserve/StaffReserveController');
const SponsorAuthController_1 = require('../controllers/Sponsor/Auth/SponsorAuthController');
const SponsorMyPageController_1 = require('../controllers/Sponsor/MyPage/SponsorMyPageController');
const SponsorReserveController_1 = require('../controllers/Sponsor/Reserve/SponsorReserveController');
const SponsorCancelController_1 = require('../controllers/Sponsor/Cancel/SponsorCancelController');
const WindowAuthController_1 = require('../controllers/Window/Auth/WindowAuthController');
const WindowMyPageController_1 = require('../controllers/Window/MyPage/WindowMyPageController');
const WindowReserveController_1 = require('../controllers/Window/Reserve/WindowReserveController');
const WindowCancelController_1 = require('../controllers/Window/Cancel/WindowCancelController');
const TelAuthController_1 = require('../controllers/Tel/Auth/TelAuthController');
const TelMyPageController_1 = require('../controllers/Tel/MyPage/TelMyPageController');
const TelReserveController_1 = require('../controllers/Tel/Reserve/TelReserveController');
const TelCancelController_1 = require('../controllers/Tel/Cancel/TelCancelController');
const ErrorController_1 = require('../controllers/Error/ErrorController');
const IndexController_1 = require('../controllers/Index/IndexController');
const MvtkUser_1 = require('../models/User/MvtkUser');
const MemberUser_1 = require('../models/User/MemberUser');
const StaffUser_1 = require('../models/User/StaffUser');
const SponsorUser_1 = require('../models/User/SponsorUser');
const WindowUser_1 = require('../models/User/WindowUser');
const TelStaffUser_1 = require('../models/User/TelStaffUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let router = new NamedRoutes();
    router.extendExpress(app);
    router.registerAppHelpers(app);
    app.get('/', 'Home', (req, res, next) => { (new IndexController_1.default(req, res, next)).index(); });
    // 言語
    app.get('/language/update/:locale', 'language.update', (req, res, next) => { (new LanguageController_1.default(req, res, next)).update(); });
    app.get('/reserve/:token/getSeatProperties', 'reserve.getSeatProperties', (req, res, next) => { (new ReserveController_1.default(req, res, next)).getSeatProperties(); });
    app.get('/reserve/:reservationId/barcode', 'reserve.barcode', (req, res, next) => { (new ReserveController_1.default(req, res, next)).barcode(); });
    app.get('/reserve/:reservationId/qrcode', 'reserve.qrcode', (req, res, next) => { (new ReserveController_1.default(req, res, next)).qrcode(); });
    // GMOプロセス
    app.get('/GMO/reserve/:token/start', 'gmo.reserve.start', (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).start(); });
    app.post('/GMO/reserve/result', 'gmo.reserve.result', (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).result(); });
    app.all('/GMO/reserve/notify', 'gmo.reserve.notify', (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).notify(); });
    app.all('/GMO/reserve/:paymentNo/cancel', 'gmo.reserve.cancel', (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).cancel(); });
    // admission
    app.get('/admission/performances', 'admission.performances', (req, res, next) => { (new AdmissionController_1.default(req, res, next)).performances(); });
    app.get('/admission/performance/:id/confirm', 'admission.confirm', (req, res, next) => { (new AdmissionController_1.default(req, res, next)).confirm(); });
    let authenticationCustomer = (req, res, next) => {
        let mvtkUser = MvtkUser_1.default.getInstance();
        if (!mvtkUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect(`/customer/login?cb=${req.originalUrl}`);
            }
        }
        else {
            next();
        }
    };
    let authenticationMember = (req, res, next) => {
        let memberUser = MemberUser_1.default.getInstance();
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
    let authenticationStaff = (req, res, next) => {
        let staffUser = StaffUser_1.default.getInstance();
        if (!staffUser.isAuthenticated()) {
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
            req.setLocale((staffUser.get('locale')) ? staffUser.get('locale') : 'en');
            next();
        }
    };
    let authenticationSponsor = (req, res, next) => {
        let sponsorUser = SponsorUser_1.default.getInstance();
        if (!sponsorUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect(`/sponsor/login?cb=${req.originalUrl}`);
            }
        }
        else {
            // 言語設定
            req.setLocale((sponsorUser.get('locale')) ? sponsorUser.get('locale') : 'en');
            next();
        }
    };
    let authenticationWindow = (req, res, next) => {
        let windowUser = WindowUser_1.default.getInstance();
        if (!windowUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect(`/window/login?cb=${req.originalUrl}`);
            }
        }
        else {
            // 言語設定
            req.setLocale((windowUser.get('locale')) ? windowUser.get('locale') : 'ja');
            next();
        }
    };
    let authenticationTelStaff = (req, res, next) => {
        let telStaffUser = TelStaffUser_1.default.getInstance();
        if (!telStaffUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            }
            else {
                res.redirect(`/tel/login?cb=${req.originalUrl}`);
            }
        }
        else {
            // 言語設定
            req.setLocale((telStaffUser.get('locale')) ? telStaffUser.get('locale') : 'ja');
            next();
        }
    };
    // 一般
    app.all('/customer/reserve/performances', 'customer.reserve.performances', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).performances(); });
    app.post('/customer/reserve/start', 'customer.reserve.start', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).start(); });
    app.all('/customer/login', 'customer.reserve.terms', (req, res, next) => { (new CustomerAuthController_1.default(req, res, next)).login(); });
    app.all('/customer/logout', 'customer.logout', authenticationCustomer, (req, res, next) => { (new CustomerAuthController_1.default(req, res, next)).logout(); });
    app.get('/customer/reserve/:token/login', 'customer.reserve.login', authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).login(); });
    app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).seats(); });
    app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).tickets(); });
    app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).profile(); });
    app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).confirm(); });
    app.get('/customer/reserve/:paymentNo/waitingSettlement', 'customer.reserve.waitingSettlement', authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/customer/reserve/:paymentNo/complete', 'customer.reserve.complete', authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).complete(); });
    // メルマガ先行
    app.all('/member/reserve/terms', 'member.reserve.terms', (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).terms(); });
    app.get('/member/reserve/start', 'member.reserve.start', (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).start(); });
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', authenticationMember, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).tickets(); });
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', authenticationMember, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).profile(); });
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', authenticationMember, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).confirm(); });
    app.get('/member/reserve/:paymentNo/complete', 'member.reserve.complete', (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).complete(); });
    // TODO admin権限フロー
    // 内部関係者
    app.all('/staff/login', 'staff.mypage.login', (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).login(); });
    app.all('/staff/logout', 'staff.logout', (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).logout(); });
    app.all('/staff/mypage', 'staff.mypage', authenticationStaff, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).index(); });
    app.get('/staff/mypage/search', 'staff.mypage.search', authenticationStaff, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).search(); });
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', authenticationStaff, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).updateWatcherName(); });
    app.get('/staff/reserve/start', 'staff.reserve.start', authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).start(); });
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).performances(); });
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).seats(); });
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).tickets(); });
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).confirm(); });
    app.get('/staff/reserve/:paymentNo/complete', 'staff.reserve.complete', authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).complete(); });
    app.post('/staff/cancel/execute', 'staff.cancel.execute', authenticationStaff, (req, res, next) => { (new StaffCancelController_1.default(req, res, next)).execute(); });
    let sponsorBase = (req, res, next) => {
        req.setLocale('en');
        next();
    };
    // 外部関係者
    app.all('/sponsor/login', 'sponsor.mypage.login', (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).login(); });
    app.all('/sponsor/logout', 'sponsor.logout', authenticationSponsor, (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).logout(); });
    app.all('/sponsor/mypage', 'sponsor.mypage', authenticationSponsor, (req, res, next) => { (new SponsorMyPageController_1.default(req, res, next)).index(); });
    app.get('/sponsor/mypage/search', 'sponsor.mypage.search', authenticationSponsor, (req, res, next) => { (new SponsorMyPageController_1.default(req, res, next)).search(); });
    app.get('/sponsor/reserve/start', 'sponsor.reserve.start', authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).start(); });
    app.all('/sponsor/reserve/:token/performances', 'sponsor.reserve.performances', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).performances(); });
    app.all('/sponsor/reserve/:token/seats', 'sponsor.reserve.seats', authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).seats(); });
    app.all('/sponsor/reserve/:token/tickets', 'sponsor.reserve.tickets', authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).tickets(); });
    app.all('/sponsor/reserve/:token/profile', 'sponsor.reserve.profile', authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).profile(); });
    app.all('/sponsor/reserve/:token/confirm', 'sponsor.reserve.confirm', authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).confirm(); });
    app.get('/sponsor/reserve/:paymentNo/complete', 'sponsor.reserve.complete', authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).complete(); });
    app.post('/sponsor/cancel/execute', 'sponsor.cancel.execute', authenticationSponsor, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).execute(); });
    // ↓ログイン不要
    app.all('/sponsor/cancel', 'sponsor.cancel', (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).index(); });
    app.post('/sponsor/cancel/executeByPaymentNo', 'sponsor.cancel.executeByPaymentNo', (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).executeByPaymentNo(); });
    // 当日窓口フロー
    // TODO 当日の場合、スケジュール選択候補は、検索条件通り全て出す
    // TODO 検索条件の初期値を、上映日：当日にする
    app.all('/window/login', 'window.mypage.login', (req, res, next) => { (new WindowAuthController_1.default(req, res, next)).login(); });
    app.all('/window/logout', 'window.logout', (req, res, next) => { (new WindowAuthController_1.default(req, res, next)).logout(); });
    app.all('/window/mypage', 'window.mypage', authenticationWindow, (req, res, next) => { (new WindowMyPageController_1.default(req, res, next)).index(); });
    app.get('/window/mypage/search', 'window.mypage.search', authenticationWindow, (req, res, next) => { (new WindowMyPageController_1.default(req, res, next)).search(); });
    app.get('/window/reserve/start', 'window.reserve.start', authenticationWindow, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).start(); });
    app.all('/window/reserve/:token/performances', 'window.reserve.performances', authenticationWindow, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).performances(); });
    app.all('/window/reserve/:token/seats', 'window.reserve.seats', authenticationWindow, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).seats(); });
    app.all('/window/reserve/:token/tickets', 'window.reserve.tickets', authenticationWindow, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).tickets(); });
    app.all('/window/reserve/:token/profile', 'window.reserve.profile', authenticationWindow, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).profile(); });
    app.all('/window/reserve/:token/confirm', 'window.reserve.confirm', authenticationWindow, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).confirm(); });
    app.get('/window/reserve/:paymentNo/complete', 'window.reserve.complete', authenticationWindow, (req, res, next) => { (new WindowReserveController_1.default(req, res, next)).complete(); });
    app.post('/window/cancel/execute', 'window.cancel.execute', authenticationWindow, (req, res, next) => { (new WindowCancelController_1.default(req, res, next)).execute(); });
    // 電話窓口フロー
    app.all('/tel/login', 'tel.mypage.login', (req, res, next) => { (new TelAuthController_1.default(req, res, next)).login(); });
    app.all('/tel/logout', 'tel.logout', (req, res, next) => { (new TelAuthController_1.default(req, res, next)).logout(); });
    app.all('/tel/mypage', 'tel.mypage', authenticationTelStaff, (req, res, next) => { (new TelMyPageController_1.default(req, res, next)).index(); });
    app.get('/tel/mypage/search', 'tel.mypage.search', authenticationTelStaff, (req, res, next) => { (new TelMyPageController_1.default(req, res, next)).search(); });
    app.get('/tel/reserve/start', 'tel.reserve.start', authenticationTelStaff, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).start(); });
    app.all('/tel/reserve/:token/performances', 'tel.reserve.performances', authenticationTelStaff, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).performances(); });
    app.all('/tel/reserve/:token/seats', 'tel.reserve.seats', authenticationTelStaff, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).seats(); });
    app.all('/tel/reserve/:token/tickets', 'tel.reserve.tickets', authenticationTelStaff, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).tickets(); });
    app.all('/tel/reserve/:token/profile', 'tel.reserve.profile', authenticationTelStaff, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).profile(); });
    app.all('/tel/reserve/:token/confirm', 'tel.reserve.confirm', authenticationTelStaff, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).confirm(); });
    app.get('/tel/reserve/:paymentNo/complete', 'tel.reserve.complete', authenticationTelStaff, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).complete(); });
    app.post('/tel/cancel/execute', 'tel.cancel.execute', authenticationTelStaff, (req, res, next) => { (new TelCancelController_1.default(req, res, next)).execute(); });
    app.get('/Error/NotFound', 'Error.NotFound', (req, res, next) => { (new ErrorController_1.default(req, res, next)).notFound(); });
    // 404
    app.use((req, res, next) => {
        return res.redirect('/Error/NotFound');
    });
    // error handlers
    app.use((err, req, res, next) => {
        (new ErrorController_1.default(req, res, next)).index(err);
    });
};
