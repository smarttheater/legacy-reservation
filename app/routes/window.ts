/**
 * 当日窓口ルーター
 *
 * @function windowRouter
 * @ignore
 */
import { Models } from '@motionpicture/chevre-domain';
import { Application, NextFunction, Request, Response } from 'express';
import * as Util from '../../common/Util/Util';
import WindowAuthController from '../controllers/Window/Auth/WindowAuthController';
import WindowCancelController from '../controllers/Window/Cancel/WindowCancelController';
import WindowMyPageController from '../controllers/Window/MyPage/WindowMyPageController';
import WindowReserveController from '../controllers/Window/Reserve/WindowReserveController';
import WindowUser from '../models/User/WindowUser';

export default (app: Application) => {
    const authentication = async (req: Request, res: Response, next: NextFunction) => {
        if (req.windowUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }

        // 既ログインの場合
        if (req.windowUser.isAuthenticated()) {
            // 言語設定
            if (req.windowUser.get('locale') !== undefined && req.windowUser.get('locale') !== null) {
                req.setLocale(req.windowUser.get('locale'));
            }

            next();
            return;
        }

        // 自動ログインチェック
        const checkRemember = async () => {
            if (req.cookies.remember_window === undefined) {
                return null;
            }

            try {
                const authenticationDoc = await Models.Authentication.findOne(
                    {
                        token: req.cookies.remember_window,
                        window: { $ne: null }
                    }
                ).exec();

                if (authenticationDoc === null) {
                    res.clearCookie('remember_window');
                    return null;
                }

                // トークン再生成
                const token = Util.createToken();
                await authenticationDoc.update({ token: token }).exec();

                // tslint:disable-next-line:no-cookies
                res.cookie('remember_window', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                return await Models.Window.findOne({ _id: authenticationDoc.get('window') }).exec();
            } catch (error) {
                return null;
            }
        };

        const user = await checkRemember();
        if (user !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[WindowUser.AUTH_SESSION_NAME] = user.toObject();
            res.redirect(req.originalUrl);
        } else {
            if (req.xhr) {
                res.json({
                    success: false,
                    message: 'login required'
                });
            } else {
                res.redirect(`/window/login?cb=${req.originalUrl}`);
            }
        }
    };

    // tslint:disable-next-line:variable-name
    const base = (req: Request, _res: Response, next: NextFunction) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.windowUser = WindowUser.parse(req.session);
        next();
    };

    // 当日窓口フロー
    // tslint:disable:max-line-length
    app.all('/window/login', base, async (req: Request, res: Response, next: NextFunction) => { await (new WindowAuthController(req, res, next)).login(); });
    app.all('/window/logout', base, async (req: Request, res: Response, next: NextFunction) => { await (new WindowAuthController(req, res, next)).logout(); });
    app.all('/window/mypage', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new WindowMyPageController(req, res, next)).index(); });
    app.get('/window/mypage/search', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowMyPageController(req, res, next)).search(); });
    app.get('/window/reserve/start', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowReserveController(req, res, next)).start(); });
    app.all('/window/reserve/:token/terms', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new WindowReserveController(req, res, next)).terms(); });
    app.all('/window/reserve/:token/performances', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowReserveController(req, res, next)).performances(); });
    app.all('/window/reserve/:token/seats', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowReserveController(req, res, next)).seats(); });
    app.all('/window/reserve/:token/tickets', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowReserveController(req, res, next)).tickets(); });
    app.all('/window/reserve/:token/profile', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowReserveController(req, res, next)).profile(); });
    app.all('/window/reserve/:token/confirm', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowReserveController(req, res, next)).confirm(); });
    app.get('/window/reserve/:paymentNo/complete', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowReserveController(req, res, next)).complete(); });
    app.post('/window/cancel/execute', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new WindowCancelController(req, res, next)).execute(); });
};
