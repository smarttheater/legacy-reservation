"use strict";
const NamedRoutes = require('named-routes');
const passport = require('passport');
const AuthController_1 = require('../controllers/Auth/AuthController');
const AdmissionController_1 = require('../controllers/Admission/AdmissionController');
const PerformanceController_1 = require('../controllers/Performance/PerformanceController');
const ReservationController_1 = require('../controllers/Reservation/ReservationController');
const ScreenController_1 = require('../controllers/Screen/ScreenController');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let router = new NamedRoutes();
    router.extendExpress(app);
    router.registerAppHelpers(app);
    app.post('/api/login', 'login', (req, res, next) => { (new AuthController_1.default(req, res, next)).login(); });
    // 要認証サービス
    app.all('/api/reservations', 'reservations', passport.authenticate('bearer', { session: false }), (req, res, next) => { (new ReservationController_1.default(req, res, next)).findByMvtkUser(); });
    app.all('/api/reservation/:id', 'reservation', passport.authenticate('bearer', { session: false }), (req, res, next) => { (new ReservationController_1.default(req, res, next)).findById(); });
    // search performances
    app.get('/api/:locale/performance/search', 'performance.search', (req, res, next) => { (new PerformanceController_1.default(req, res, next)).search(); });
    // reservation email
    app.post('/api/:locale/reservation/email', 'reservation.email', (req, res, next) => { (new ReservationController_1.default(req, res, next)).email(); });
    // show screen html
    app.get('/api/screen/:id/show', 'screen.show', (req, res, next) => { (new ScreenController_1.default(req, res, next)).show(); });
    // create new admission
    app.post('/api/admission/create', 'admission.add', (req, res, next) => { (new AdmissionController_1.default(req, res, next)).create(); });
    // 404
    app.use((req, res, next) => {
        res.json({
            isSuccess: false,
            message: 'Not Found'
        });
    });
    // error handlers
    app.use((err, req, res, next) => {
        res.json({
            isSuccess: false,
            message: 'Internal Server Error'
        });
    });
};
