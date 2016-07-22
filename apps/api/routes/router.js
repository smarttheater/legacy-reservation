"use strict";
var NamedRoutes = require('named-routes');
var PerformanceController_1 = require('../controllers/Performance/PerformanceController');
var ReservationController_1 = require('../controllers/Reservation/ReservationController');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = function (app) {
    var router = new NamedRoutes();
    router.extendExpress(app);
    router.registerAppHelpers(app);
    // search performances
    app.get('/api/:locale/performance/search', 'performance.search', function (req, res, next) { (new PerformanceController_1.default(req, res, next)).search(); });
    // reservation email
    app.post('/api/:locale/reservation/email', 'reservation.email', function (req, res, next) { (new ReservationController_1.default(req, res, next)).email(); });
    // 404
    app.use(function (req, res, next) {
        res.json({
            isSuccess: false,
            message: 'Not Found'
        });
    });
    // error handlers
    app.use(function (err, req, res, next) {
        res.json({
            isSuccess: false,
            message: 'Internal Server Error'
        });
    });
};
