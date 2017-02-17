/**
 * メルマガ先行会員ルーター
 *
 * @function memberRouter
 * @ignore
 */
import { NextFunction, Request, Response } from 'express';
import MemberAuthController from '../controllers/Member/Auth/MemberAuthController';
import MemberReserveController from '../controllers/Member/Reserve/MemberReserveController';
import MemberUser from '../models/User/MemberUser';

export default (app: any) => {
    const authenticationMiddleware = (req: Request, res: Response, next: NextFunction) => {
        if (!req.memberUser) return next(new Error(req.__('Message.UnexpectedError')));

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
    const baseMiddleware = (req: Request, _res: Response, next: NextFunction) => {
        req.memberUser = MemberUser.parse(req.session);
        next();
    };

    // メルマガ先行
    app.all('/member/login', 'member.reserve.terms', baseMiddleware, (req: Request, res: Response, next: NextFunction) => { (new MemberAuthController(req, res, next)).login(); });
    app.get('/member/reserve/start', 'member.reserve.start', baseMiddleware, (req: Request, res: Response, next: NextFunction) => { (new MemberReserveController(req, res, next)).start(); });
    app.all('/member/reserve/:token/tickets', 'member.reserve.tickets', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new MemberReserveController(req, res, next)).tickets(); });
    app.all('/member/reserve/:token/profile', 'member.reserve.profile', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new MemberReserveController(req, res, next)).profile(); });
    app.all('/member/reserve/:token/confirm', 'member.reserve.confirm', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new MemberReserveController(req, res, next)).confirm(); });
    app.get('/member/reserve/:paymentNo/complete', 'member.reserve.complete', baseMiddleware, (req: Request, res: Response, next: NextFunction) => { (new MemberReserveController(req, res, next)).complete(); });
};
