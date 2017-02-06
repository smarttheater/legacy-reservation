"use strict";
const MemberAuthController_1 = require("../controllers/Member/Auth/MemberAuthController");
const MemberReserveController_1 = require("../controllers/Member/Reserve/MemberReserveController");
const MemberUser_1 = require("../models/User/MemberUser");
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
                res.redirect('/member/login');
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
    app.all('/member/login', 'member.reserve.terms', base, (req, res, next) => { (new MemberAuthController_1.default(req, res, next)).login(); });
    app.get('/member/reserve/start', 'member.reserve.start', base, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).start(); });
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', base, authentication, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).tickets(); });
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', base, authentication, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).profile(); });
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', base, authentication, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).confirm(); });
    app.get('/member/reserve/:paymentNo/complete', 'member.reserve.complete', base, (req, res, next) => { (new MemberReserveController_1.default(req, res, next)).complete(); });
};
