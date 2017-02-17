import * as express from 'express';

import MemberAuthController from '../controllers/Member/Auth/MemberAuthController';
import MemberReserveController from '../controllers/Member/Reserve/MemberReserveController';

import MemberUser from '../models/User/MemberUser';

export default (app: any) => {
    const authenticationMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.memberUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            } else {
                res.redirect('/member/login');
            }
        } else {
            next();
        }
    };

    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        req.memberUser = MemberUser.parse(req.session);
        next();
    };

    // メルマガ先行
    app.all('/member/login', 'member.reserve.terms', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new MemberAuthController(req, res, next)).login(); });
    app.get('/member/reserve/start', 'member.reserve.start', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new MemberReserveController(req, res, next)).start(); });
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new MemberReserveController(req, res, next)).tickets(); });
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new MemberReserveController(req, res, next)).profile(); });
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new MemberReserveController(req, res, next)).confirm(); });
    app.get('/member/reserve/:paymentNo/complete', 'member.reserve.complete', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new MemberReserveController(req, res, next)).complete(); });
};
