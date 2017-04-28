/**
 * メルマガ先行会員ルーター
 *
 * @function memberRouter
 * @ignore
 */
import { Application, NextFunction, Request, Response } from 'express';
import MemberAuthController from '../controllers/Member/Auth/MemberAuthController';
import MemberReserveController from '../controllers/Member/Reserve/MemberReserveController';
import MemberUser from '../models/user/member';

export default (app: Application) => {
    const authentication = async (req: Request, res: Response, next: NextFunction) => {
        if (req.memberUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }

        // 既ログインの場合
        if (req.memberUser.isAuthenticated()) {
            next();
            return;
        }

        if (req.xhr) {
            res.json({
                success: false,
                message: 'login required'
            });
        } else {
            res.redirect('/member/login');
        }
    };

    // tslint:disable-next-line:variable-name
    const base = async (req: Request, _res: Response, next: NextFunction) => {
        req.memberUser = MemberUser.parse(req.session);
        next();
    };

    // メルマガ先行
    // tslint:disable:max-line-length
    app.all('/member/login', base, async (req: Request, res: Response, next: NextFunction) => { await (new MemberAuthController(req, res, next)).login(); });
    app.get('/member/reserve/start', base, async (req: Request, res: Response, next: NextFunction) => { await (new MemberReserveController(req, res, next)).start(); });
    app.all('/member/reserve/:token/tickets', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new MemberReserveController(req, res, next)).tickets(); });
    app.all('/member/reserve/:token/profile', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new MemberReserveController(req, res, next)).profile(); });
    app.all('/member/reserve/:token/confirm', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new MemberReserveController(req, res, next)).confirm(); });
    app.get('/member/reserve/:performanceDay/:paymentNo/complete', base, async (req: Request, res: Response, next: NextFunction) => { await (new MemberReserveController(req, res, next)).complete(); });
};
