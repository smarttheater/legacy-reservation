import express = require('express');

import MemberReserveController from '../controllers/Member/Reserve/MemberReserveController';

import MemberUser from '../models/User/MemberUser';

export default (app: any) => {
    let authentication = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.memberUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            } else {
                res.redirect('/member/reserve/terms');
            }
        } else {
            next();
        }
    }

    let base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.memberUser = MemberUser.parse(req.session);
        next();
    }


    // メルマガ先行
    app.all('/member/reserve/terms', 'member.reserve.terms', base, (req, res, next) => {(new MemberReserveController(req, res, next)).terms()});
    app.get('/member/reserve/start', 'member.reserve.start', base, (req, res, next) => {(new MemberReserveController(req, res, next)).start()});
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', base, authentication, (req, res, next) => {(new MemberReserveController(req, res, next)).tickets()});
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', base, authentication, (req, res, next) => {(new MemberReserveController(req, res, next)).profile()});
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', base, authentication, (req, res, next) => {(new MemberReserveController(req, res, next)).confirm()});
    app.get('/member/reserve/:paymentNo/complete', 'member.reserve.complete', base, (req, res, next) => {(new MemberReserveController(req, res, next)).complete()});
}
