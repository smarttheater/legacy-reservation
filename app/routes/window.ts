import * as express from 'express';
import * as mongoose from 'mongoose';

import { Models } from '@motionpicture/ttts-domain';
import Util from '../../common/Util/Util';
import WindowAuthController from '../controllers/Window/Auth/WindowAuthController';
import WindowCancelController from '../controllers/Window/Cancel/WindowCancelController';
import WindowMyPageController from '../controllers/Window/MyPage/WindowMyPageController';
import WindowReserveController from '../controllers/Window/Reserve/WindowReserveController';

import WindowUser from '../models/User/WindowUser';

export default (app: any) => {
    const authenticationMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.windowUser) return next(new Error(req.__('Message.UnexpectedError')));

        if (!req.windowUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb: (user: mongoose.Document | null) => void) => {
                if (req.cookies.remember_window) {
                    Models.Authentication.findOne(
                        {
                            token: req.cookies.remember_window,
                            window: { $ne: null }
                        },
                        (err, authentication) => {
                            if (err) return cb(null);

                            if (authentication) {
                                // トークン再生成
                                const token = Util.createToken();
                                authentication.update(
                                    {
                                        token: token
                                    },
                                    (updateErr) => {
                                        if (updateErr) return cb(null);

                                        res.cookie('remember_window', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                        Models.Window.findOne({ _id: authentication.get('window') }, (findErr, window) => {
                                            (findErr) ? cb(null) : cb(window);
                                        });
                                    }
                                );
                            } else {
                                res.clearCookie('remember_window');
                                cb(null);
                            }
                        }
                    );
                } else {
                    cb(null);
                }
            };

            checkRemember((user) => {
                if (user && req.session) {
                    // ログインしてリダイレクト
                    req.session[WindowUser.AUTH_SESSION_NAME] = user.toObject();

                    // if exist parameter cb, redirect to cb.
                    res.redirect(req.originalUrl);
                } else {
                    if (req.xhr) {
                        res.json({
                            message: 'login required.'
                        });
                    } else {
                        res.redirect(`/window/login?cb=${req.originalUrl}`);
                    }
                }
            });
        } else {
            // 言語設定
            req.setLocale((req.windowUser.get('locale')) ? req.windowUser.get('locale') : 'ja');

            next();
        }
    };

    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.windowUser = WindowUser.parse(req.session);
        next();
    };

    // 当日窓口フロー
    app.all('/window/login', 'window.mypage.login', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowAuthController(req, res, next)).login(); });
    app.all('/window/logout', 'window.logout', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowAuthController(req, res, next)).logout(); });
    app.all('/window/mypage', 'window.mypage', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowMyPageController(req, res, next)).index(); });
    app.get('/window/mypage/search', 'window.mypage.search', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowMyPageController(req, res, next)).search(); });
    app.get('/window/reserve/start', 'window.reserve.start', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowReserveController(req, res, next)).start(); });
    app.all('/window/reserve/:token/terms', 'window.reserve.terms', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowReserveController(req, res, next)).terms(); });
    app.all('/window/reserve/:token/performances', 'window.reserve.performances', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowReserveController(req, res, next)).performances(); });
    app.all('/window/reserve/:token/seats', 'window.reserve.seats', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowReserveController(req, res, next)).seats(); });
    app.all('/window/reserve/:token/tickets', 'window.reserve.tickets', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowReserveController(req, res, next)).tickets(); });
    app.all('/window/reserve/:token/profile', 'window.reserve.profile', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowReserveController(req, res, next)).profile(); });
    app.all('/window/reserve/:token/confirm', 'window.reserve.confirm', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowReserveController(req, res, next)).confirm(); });
    app.get('/window/reserve/:paymentNo/complete', 'window.reserve.complete', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowReserveController(req, res, next)).complete(); });
    app.post('/window/cancel/execute', 'window.cancel.execute', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new WindowCancelController(req, res, next)).execute(); });
};
