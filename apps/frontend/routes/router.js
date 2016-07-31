"use strict";
const NamedRoutes = require('named-routes');
const AdmissionController_1 = require('../controllers/Admission/AdmissionController');
const CustomerReserveController_1 = require('../controllers/Customer/Reserve/CustomerReserveController');
const MemberReserveController_1 = require('../controllers/Member/Reserve/MemberReserveController');
const GMOReserveController_1 = require('../controllers/GMO/Reserve/GMOReserveController');
const ReserveController_1 = require('../controllers/Reserve/ReserveController');
const LanguageController_1 = require('../controllers/Language/LanguageController');
const StaffAuthController_1 = require('../controllers/Staff/Auth/StaffAuthController');
const StaffCancelController_1 = require('../controllers/Staff/Cancel/StaffCancelController');
const StaffMyPageController_1 = require('../controllers/Staff/MyPage/StaffMyPageController');
const StaffReserveController_1 = require('../controllers/Staff/Reserve/StaffReserveController');
const SponsorAuthController_1 = require('../controllers/Sponsor/Auth/SponsorAuthController');
const SponsorMyPageController_1 = require('../controllers/Sponsor/MyPage/SponsorMyPageController');
const SponsorReserveController_1 = require('../controllers/Sponsor/Reserve/SponsorReserveController');
const SponsorCancelController_1 = require('../controllers/Sponsor/Cancel/SponsorCancelController');
const ErrorController_1 = require('../controllers/Error/ErrorController');
const IndexController_1 = require('../controllers/Index/IndexController');
const MemberUser_1 = require('../models/User/MemberUser');
const StaffUser_1 = require('../models/User/StaffUser');
const SponsorUser_1 = require('../models/User/SponsorUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let router = new NamedRoutes();
    router.extendExpress(app);
    router.registerAppHelpers(app);
    app.get('/', 'Home', (req, res, next) => { (new IndexController_1.default(req, res, next)).index(); });
    // 言語
    app.get('/language/update/:locale', 'language.update', (req, res, next) => { (new LanguageController_1.default(req, res, next)).update(); });
    app.get('/reserve/:token/getSeatProperties', 'reserve.getSeatProperties', (req, res, next) => { (new ReserveController_1.default(req, res, next)).getSeatProperties(); });
    app.get('/reserve/:token/:reservationId/barcode', 'reserve.barcode', (req, res, next) => { (new ReserveController_1.default(req, res, next)).barcode(); });
    app.get('/reserve/:token/:reservationId/qrcode', 'reserve.qrcode', (req, res, next) => { (new ReserveController_1.default(req, res, next)).qrcode(); });
    // GMOプロセス
    app.get('/GMO/reserve/:token/start', 'gmo.reserve.start', (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).start(); });
    app.post('/GMO/reserve/result', 'gmo.reserve.result', (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).result(); });
    app.all('/GMO/reserve/notify', 'gmo.reserve.notify', (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).notify(); });
    // 一般
    app.all('/customer/reserve/performances', 'customer.reserve.performances', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).performances(); });
    app.post('/customer/reserve/start', 'customer.reserve.start', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).start(); });
    app.all('/customer/reserve/:token/terms', 'customer.reserve.terms', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).terms(); });
    app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).seats(); });
    app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).tickets(); });
    app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).profile(); });
    app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).confirm(); });
    app.get('/customer/reserve/:token/waitingSettlement', 'customer.reserve.waitingSettlement', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/customer/reserve/:token/complete', 'customer.reserve.complete', (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).complete(); });
    // admission
    app.get('/admission/performances', 'admission.performances', (req, res, next) => { (new AdmissionController_1.default(req, res, next)).performances(); });
    app.get('/admission/performance/:id/confirm', 'admission.confirm', (req, res, next) => { (new AdmissionController_1.default(req, res, next)).confirm(); });
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
                res.redirect('/staff/login');
            }
        }
        else {
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
                res.redirect('/sponsor/login');
            }
        }
        else {
            next();
        }
    };
    // メルマガ先行
    app.all('/member/reserve/terms', 'member.reserve.terms', (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).terms(); });
    app.get('/member/reserve/start', 'member.reserve.start', (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).start(); });
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', authenticationMember, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).tickets(); });
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', authenticationMember, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).profile(); });
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', authenticationMember, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).confirm(); });
    app.get('/member/reserve/:token/waitingSettlement', 'member.reserve.waitingSettlement', authenticationMember, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/member/reserve/:token/complete', 'member.reserve.complete', authenticationMember, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).complete(); });
    // TODO admin権限フロー
    let staffBase = (req, res, next) => {
        req.setLocale('en');
        next();
    };
    // 内部関係者
    app.all('/staff/login', 'staff.login', staffBase, (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).login(); });
    app.all('/staff/logout', 'staff.logout', staffBase, (req, res, next) => { (new StaffAuthController_1.default(req, res, next)).logout(); });
    app.all('/staff/mypage', 'staff.mypage', staffBase, authenticationStaff, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).index(); });
    app.get('/staff/mypage/search', 'staff.mypage.search', staffBase, authenticationStaff, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).search(); });
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', staffBase, authenticationStaff, (req, res, next) => { (new StaffMyPageController_1.default(req, res, next)).updateWatcherName(); });
    app.get('/staff/reserve/start', 'staff.reserve.start', staffBase, authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).start(); });
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', staffBase, authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).performances(); });
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', staffBase, authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).seats(); });
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', staffBase, authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).tickets(); });
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', staffBase, authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).confirm(); });
    app.get('/staff/reserve/:token/process', 'staff.reserve.process', staffBase, authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).process(); });
    app.get('/staff/reserve/:token/complete', 'staff.reserve.complete', staffBase, authenticationStaff, (req, res, next) => { (new StaffReserveController_1.default(req, res, next)).complete(); });
    app.post('/staff/cancel/execute', 'staff.cancel.execute', staffBase, authenticationStaff, (req, res, next) => { (new StaffCancelController_1.default(req, res, next)).execute(); });
    let sponsorBase = (req, res, next) => {
        req.setLocale('en');
        next();
    };
    // 外部関係者
    // TODO キャンセルするためだけのフォームページ
    app.all('/sponsor/login', 'sponsor.login', sponsorBase, (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).login(); });
    app.all('/sponsor/logout', 'sponsor.logout', sponsorBase, (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).logout(); });
    app.all('/sponsor/mypage', 'sponsor.mypage', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorMyPageController_1.default(req, res, next)).index(); });
    app.get('/sponsor/reserve/start', 'sponsor.reserve.start', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).start(); });
    app.all('/sponsor/reserve/:token/performances', 'sponsor.reserve.performances', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).performances(); });
    app.all('/sponsor/reserve/:token/seats', 'sponsor.reserve.seats', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).seats(); });
    app.all('/sponsor/reserve/:token/tickets', 'sponsor.reserve.tickets', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).tickets(); });
    app.all('/sponsor/reserve/:token/profile', 'sponsor.reserve.profile', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).profile(); });
    app.all('/sponsor/reserve/:token/confirm', 'sponsor.reserve.confirm', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).confirm(); });
    app.get('/sponsor/reserve/:token/process', 'sponsor.reserve.process', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).process(); });
    app.get('/sponsor/reserve/:token/complete', 'sponsor.reserve.complete', sponsorBase, authenticationSponsor, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).complete(); });
    app.post('/sponsor/cancel/execute', 'sponsor.cancel.execute', authenticationSponsor, sponsorBase, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).execute(); });
    // TODO 当日窓口フロー
    // 当日の場合、スケジュール選択候補は、検索条件通り全て出す
    // 検索条件の初期値を、上映日：当日にする
    // 4席制限
    // TODO 電話窓口フロー
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
