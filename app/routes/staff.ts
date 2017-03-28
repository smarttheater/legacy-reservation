/**
 * 内部関係者ルーター
 *
 * @function staffRouter
 * @ignore
 */
import { Models } from '@motionpicture/chevre-domain';
import { NextFunction, Request, Response } from 'express';
import * as Util from '../../common/Util/Util';
import StaffAuthController from '../controllers/Staff/Auth/StaffAuthController';
import StaffCancelController from '../controllers/Staff/Cancel/StaffCancelController';
import StaffMyPageController from '../controllers/Staff/MyPage/StaffMyPageController';
import StaffReserveController from '../controllers/Staff/Reserve/StaffReserveController';
import StaffUser from '../models/User/StaffUser';

export default (app: any) => {
    const authentication = async (req: Request, res: Response, next: NextFunction) => {
        if (req.staffUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }

        // 既ログインの場合
        if (req.staffUser.isAuthenticated()) {
            // 言語設定
            if (req.staffUser.get('locale') !== undefined && req.staffUser.get('locale') !== null) {
                req.setLocale(req.staffUser.get('locale'));
            }

            next();
            return;
        }

        // 自動ログインチェック
        const checkRemember = async () => {
            if (req.cookies.remember_staff === undefined) {
                return null;
            }

            try {
                const authenticationDoc = await Models.Authentication.findOne(
                    {
                        token: req.cookies.remember_staff,
                        staff: { $ne: null }
                    }
                ).exec();

                if (authenticationDoc === null) {
                    res.clearCookie('remember_staff');
                    return null;
                }

                // トークン再生成
                const token = Util.createToken();
                await authenticationDoc.update({ token: token }).exec();

                // tslint:disable-next-line:no-cookies
                res.cookie('remember_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                const staff = await Models.Staff.findOne({ _id: authenticationDoc.get('staff') }).exec();
                return {
                    staff: staff,
                    signature: authenticationDoc.get('signature'),
                    locale: authenticationDoc.get('locale')
                };
            } catch (error) {
                return null;
            }
        };

        const userSession = await checkRemember();
        if (userSession !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[StaffUser.AUTH_SESSION_NAME] = userSession.staff.toObject();
            req.session[StaffUser.AUTH_SESSION_NAME].signature = userSession.signature;
            req.session[StaffUser.AUTH_SESSION_NAME].locale = userSession.locale;
            res.redirect(req.originalUrl);
        } else {
            if (req.xhr) {
                res.json({
                    success: false,
                    message: 'login required'
                });
            } else {
                res.redirect(`/staff/login?cb=${req.originalUrl}`);
            }
        }
    };

    // tslint:disable-next-line:variable-name
    const base = (req: Request, _res: Response, next: NextFunction) => {
        req.staffUser = StaffUser.parse(req.session);
        next();
    };

    // 内部関係者
    // tslint:disable:max-line-length
    app.all('/staff/login', 'staff.mypage.login', base, (req: Request, res: Response, next: NextFunction) => { (new StaffAuthController(req, res, next)).login(); });
    app.all('/staff/logout', 'staff.logout', base, async (req: Request, res: Response, next: NextFunction) => { await (new StaffAuthController(req, res, next)).logout(); });
    app.all('/staff/mypage', 'staff.mypage', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffMyPageController(req, res, next)).index(); });
    app.get('/staff/mypage/search', 'staff.mypage.search', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffMyPageController(req, res, next)).search(); });
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffMyPageController(req, res, next)).updateWatcherName(); });
    app.get('/staff/reserve/start', 'staff.reserve.start', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffReserveController(req, res, next)).start(); });
    app.all('/staff/reserve/:token/terms', 'staff.reserve.terms', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new StaffReserveController(req, res, next)).terms(); });
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffReserveController(req, res, next)).performances(); });
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffReserveController(req, res, next)).seats(); });
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffReserveController(req, res, next)).tickets(); });
    app.all('/staff/reserve/:token/profile', 'staff.reserve.profile', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffReserveController(req, res, next)).profile(); });
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffReserveController(req, res, next)).confirm(); });
    app.get('/staff/reserve/:paymentNo/complete', 'staff.reserve.complete', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffReserveController(req, res, next)).complete(); });
    app.post('/staff/cancel/execute', 'staff.cancel.execute', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new StaffCancelController(req, res, next)).execute(); });
    app.all('/staff/mypage/release', 'staff.mypage.release', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new StaffMyPageController(req, res, next)).release(); });
};
