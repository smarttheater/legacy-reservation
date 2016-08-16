"use strict";
const MemberReserveController_1 = require('../controllers/Member/Reserve/MemberReserveController');
const MemberUser_1 = require('../models/User/MemberUser');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    let authentication = (req, res, next) => {
        if (!req.memberUser.isAuthenticated()) {
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
    let base = (req, res, next) => {
        req.memberUser = MemberUser_1.default.parse(req.session);
        next();
    };
    // メルマガ先行
    app.all('/member/reserve/terms', 'member.reserve.terms', (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).terms(); });
    app.get('/member/reserve/start', 'member.reserve.start', (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).start(); });
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', authentication, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).tickets(); });
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', authentication, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).profile(); });
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', authentication, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).confirm(); });
    app.get('/member/reserve/:paymentNo/complete', 'member.reserve.complete', (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).complete(); });
};
