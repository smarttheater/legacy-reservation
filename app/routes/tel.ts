/**
 * 電話窓口ルーター
 *
 * @function telRouter
 * @ignore
 */
import { Models } from '@motionpicture/chevre-domain';
import { Application, NextFunction, Request, Response } from 'express';
import * as Util from '../../common/Util/Util';
import TelAuthController from '../controllers/Tel/Auth/TelAuthController';
import TelCancelController from '../controllers/Tel/Cancel/TelCancelController';
import TelMyPageController from '../controllers/Tel/MyPage/TelMyPageController';
import TelReserveController from '../controllers/Tel/Reserve/TelReserveController';
import TelStaffUser from '../models/User/TelStaffUser';

export default (app: Application) => {
    const authentication = async (req: Request, res: Response, next: NextFunction) => {
        if (req.telStaffUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }

        // 既ログインの場合
        if (req.telStaffUser.isAuthenticated()) {
            // 言語設定
            if (req.telStaffUser.get('locale') !== undefined && req.telStaffUser.get('locale') !== null) {
                req.setLocale(req.telStaffUser.get('locale'));
            }

            next();
            return;
        }

        // 自動ログインチェック
        const checkRemember = async () => {
            if (req.cookies.remember_tel_staff === undefined) {
                return null;
            }

            try {
                const authenticationDoc = await Models.Authentication.findOne(
                    {
                        token: req.cookies.remember_tel_staff,
                        tel_staff: { $ne: null }
                    }
                ).exec();

                if (authenticationDoc === null) {
                    res.clearCookie('remember_tel_staff');
                    return null;
                }

                // トークン再生成
                const token = Util.createToken();
                await authenticationDoc.update({ token: token }).exec();

                // tslint:disable-next-line:no-cookies
                res.cookie('remember_tel_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                return await Models.TelStaff.findOne({ _id: authenticationDoc.get('tel_staff') }).exec();
            } catch (error) {
                return null;
            }

        };

        const user = await checkRemember();
        if (user !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[TelStaffUser.AUTH_SESSION_NAME] = user.toObject();
            res.redirect(req.originalUrl);
        } else {
            if (req.xhr) {
                res.json({
                    success: false,
                    message: 'login required'
                });
            } else {
                res.redirect(`/tel/login?cb=${req.originalUrl}`);
            }
        }
    };

    // tslint:disable-next-line:variable-name
    const base = (req: Request, _res: Response, next: NextFunction) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.telStaffUser = TelStaffUser.parse(req.session);
        next();
    };

    // 電話窓口フロー
    // tslint:disable:max-line-length
    app.all('/tel/login', base, (req: Request, res: Response, next: NextFunction) => { (new TelAuthController(req, res, next)).login(); });
    app.all('/tel/logout', base, async (req: Request, res: Response, next: NextFunction) => { await (new TelAuthController(req, res, next)).logout(); });
    app.all('/tel/mypage', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new TelMyPageController(req, res, next)).index(); });
    app.get('/tel/mypage/search', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelMyPageController(req, res, next)).search(); });
    app.get('/tel/reserve/start', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelReserveController(req, res, next)).start(); });
    app.all('/tel/reserve/:token/terms', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new TelReserveController(req, res, next)).terms(); });
    app.all('/tel/reserve/:token/performances', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelReserveController(req, res, next)).performances(); });
    app.all('/tel/reserve/:token/seats', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelReserveController(req, res, next)).seats(); });
    app.all('/tel/reserve/:token/tickets', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelReserveController(req, res, next)).tickets(); });
    app.all('/tel/reserve/:token/profile', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelReserveController(req, res, next)).profile(); });
    app.all('/tel/reserve/:token/confirm', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelReserveController(req, res, next)).confirm(); });
    app.get('/tel/reserve/:paymentNo/complete', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelReserveController(req, res, next)).complete(); });
    app.post('/tel/cancel/execute', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelCancelController(req, res, next)).execute(); });
    app.post('/tel/cancel2sagyo/execute', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new TelCancelController(req, res, next)).execute2sagyo(); });
};
