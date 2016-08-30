"use strict";
const AdmissionController_1 = require('../controllers/Admission/AdmissionController');
const GMOReserveController_1 = require('../controllers/GMO/Reserve/GMOReserveController');
const ReserveController_1 = require('../controllers/Reserve/ReserveController');
const LanguageController_1 = require('../controllers/Language/LanguageController');
const OtherController_1 = require('../controllers/Other/OtherController');
const CustomerReserveController_1 = require('../controllers/Customer/Reserve/CustomerReserveController');
const ErrorController_1 = require('../controllers/Error/ErrorController');
const IndexController_1 = require('../controllers/Index/IndexController');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let base = (req, res, next) => {
        next();
    };
    app.get('/', 'home', base, (req, res, next) => { (new IndexController_1.default(req, res, next)).index(); });
    // 言語
    app.get('/language/update/:locale', 'language.update', base, (req, res, next) => { (new LanguageController_1.default(req, res, next)).update(); });
    app.get('/reserve/:token/getSeatProperties', 'reserve.getSeatProperties', base, (req, res, next) => { (new ReserveController_1.default(req, res, next)).getSeatProperties(); });
    app.get('/reserve/:reservationId/qrcode', 'reserve.qrcode', base, (req, res, next) => { (new ReserveController_1.default(req, res, next)).qrcode(); });
    app.get('/reserve/:performanceId/unavailableSeatCodes', 'reserve.getUnavailableSeatCodes', base, (req, res, next) => { (new ReserveController_1.default(req, res, next)).getUnavailableSeatCodes(); });
    // GMOプロセス
    app.post('/GMO/reserve/:token/start', 'gmo.reserve.start', base, (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).start(); });
    app.post('/GMO/reserve/result', 'gmo.reserve.result', base, (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).result(); });
    app.get('/GMO/reserve/:paymentNo/cancel', 'gmo.reserve.cancel', base, (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).cancel(); });
    app.post('/GMO/reserve/notify', 'gmo.reserve.notify', base, (req, res, next) => { (new GMOReserveController_1.default(req, res, next)).notify(); });
    // admission
    app.all('/admission/performances', 'admission.performances', base, (req, res, next) => { (new AdmissionController_1.default(req, res, next)).performances(); });
    app.get('/admission/performance/:id/confirm', 'admission.confirm', base, (req, res, next) => { (new AdmissionController_1.default(req, res, next)).confirm(); });
    app.get('/policy', 'policy', base, (req, res, next) => { (new OtherController_1.default(req, res, next)).policy(); });
    app.get('/privacy', 'privacy', base, (req, res, next) => { (new OtherController_1.default(req, res, next)).privacy(); });
    app.get('/commercialTransactions', 'commercialTransactions', base, (req, res, next) => { (new OtherController_1.default(req, res, next)).commercialTransactions(); });
    // 一般
    app.all('/customer/reserve/performances', 'customer.reserve.performances', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).performances(); });
    app.get('/customer/reserve/start', 'customer.reserve.start', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).start(); });
    app.all('/customer/reserve/:token/terms', 'customer.reserve.terms', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).terms(); });
    app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).seats(); });
    app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).tickets(); });
    app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).profile(); });
    app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).confirm(); });
    app.get('/customer/reserve/:paymentNo/waitingSettlement', 'customer.reserve.waitingSettlement', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).waitingSettlement(); });
    app.get('/customer/reserve/:paymentNo/complete', 'customer.reserve.complete', base, (req, res, next) => { (new CustomerReserveController_1.default(req, res, next)).complete(); });
    app.get('/error/notFound', 'error.notFound', base, (req, res, next) => { (new ErrorController_1.default(req, res, next)).notFound(); });
    // 404
    app.use((req, res, next) => {
        return res.redirect('/error/notFound');
    });
    // error handlers
    app.use((err, req, res, next) => {
        req.route.name = 'error.error';
        (new ErrorController_1.default(req, res, next)).index(err);
    });
};
