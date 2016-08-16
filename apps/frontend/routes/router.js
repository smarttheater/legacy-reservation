"use strict";
const AdmissionController_1 = require('../controllers/Admission/AdmissionController');
const GMOReserveController_1 = require('../controllers/GMO/Reserve/GMOReserveController');
const ReserveController_1 = require('../controllers/Reserve/ReserveController');
const LanguageController_1 = require('../controllers/Language/LanguageController');
const CustomerAuthController_1 = require('../controllers/Customer/Auth/CustomerAuthController');
const CustomerReserveController_1 = require('../controllers/Customer/Reserve/CustomerReserveController');
const ErrorController_1 = require('../controllers/Error/ErrorController');
const IndexController_1 = require('../controllers/Index/IndexController');
const MvtkUser_1 = require('../models/User/MvtkUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let base = (req, res, next) => {
        req.mvtkUser = MvtkUser_1.default.parse(req.session);
        next();
    };
    app.get('/', 'Home', base, (req, res, next) => { (new IndexController_1.default(req, res, next)).index(); });
    // 言語
    app.get('/language/update/:locale', 'language.update', base, (req, res, next) => { (new LanguageController_1.default(req, res, next)).update(); });
    app.get('/reserve/:token/getSeatProperties', 'reserve.getSeatProperties', base, (req, res, next) => { (new ReserveController_1.default(req, res, next)).getSeatProperties(); });
    app.get('/reserve/:reservationId/barcode', 'reserve.barcode', base, (req, res, next) => { (new ReserveController_1.default(req, res, next)).barcode(); });
    app.get('/reserve/:reservationId/qrcode', 'reserve.qrcode', base, (req, res, next) => { (new ReserveController_1.default(req, res, next)).qrcode(); });
    // GMOプロセス
    app.post('/GMO/reserve/:token/start', 'gmo.reserve.start', base, (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).start(); });
    app.post('/GMO/reserve/result', 'gmo.reserve.result', base, (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).result(); });
    app.all('/GMO/reserve/notify', 'gmo.reserve.notify', base, (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).notify(); });
    app.all('/GMO/reserve/:paymentNo/cancel', 'gmo.reserve.cancel', base, (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).cancel(); });
    // admission
    app.get('/admission/performances', 'admission.performances', base, (req, res, next) => { (new AdmissionController_1.default(req, res, next)).performances(); });
    app.get('/admission/performance/:id/confirm', 'admission.confirm', base, (req, res, next) => { (new AdmissionController_1.default(req, res, next)).confirm(); });
    let authenticationCustomer = (req, res, next) => {
        if (!req.mvtkUser.isAuthenticated()) {
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
    // TODO ムビチケ会員登録
    // 一般
    app.all('/customer/reserve/performances', 'customer.reserve.performances', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).performances(); });
    app.get('/customer/reserve/start', 'customer.reserve.start', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).start(); });
    app.all('/customer/login', 'customer.reserve.terms', base, (req, res, next) => { (new CustomerAuthController_1.default(req, res, next)).login(); });
    app.all('/customer/logout', 'customer.logout', base, authenticationCustomer, (req, res, next) => { (new CustomerAuthController_1.default(req, res, next)).logout(); });
    app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', base, authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).seats(); });
    app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', base, authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).tickets(); });
    app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', base, authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).profile(); });
    app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', base, authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).confirm(); });
    app.get('/customer/reserve/:paymentNo/waitingSettlement', 'customer.reserve.waitingSettlement', base, authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/customer/reserve/:paymentNo/complete', 'customer.reserve.complete', base, authenticationCustomer, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).complete(); });
    app.get('/Error/NotFound', 'Error.NotFound', base, (req, res, next) => { (new ErrorController_1.default(req, res, next)).notFound(); });
    // 404
    app.use((req, res, next) => {
        return res.redirect('/Error/NotFound');
    });
    // error handlers
    app.use((err, req, res, next) => {
        (new ErrorController_1.default(req, res, next)).index(err);
    });
};
