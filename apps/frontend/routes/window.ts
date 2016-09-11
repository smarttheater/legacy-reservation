import express = require('express');

import WindowAuthController from '../controllers/Window/Auth/WindowAuthController';
import WindowMyPageController from '../controllers/Window/MyPage/WindowMyPageController';
import WindowReserveController from '../controllers/Window/Reserve/WindowReserveController';
import WindowCancelController from '../controllers/Window/Cancel/WindowCancelController';
import Models from '../../common/models/Models';
import Util from '../../common/Util/Util';

import WindowUser from '../models/User/WindowUser';

export default (app: any) => {
    let authentication = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.windowUser.isAuthenticated()) {
            // 自動ログインチェック
            let checkRemember = (cb: (user) => void) => {
                if (req.cookies.remember_window) {
                    Models.Authentication.findOne(
                        {
                            token: req.cookies.remember_window,
                            window: {$ne: null}
                        },
                        (err, authentication) => {
                            if (authentication) {
                                // トークン再生成
                                let token = Util.createToken();
                                authentication.update({
                                    token: token
                                }, (err, raw) => {
                                    if (err) cb(null);

                                    res.cookie('remember_window', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                    Models.Window.findOne({_id: authentication.get('window')}, (err, window) => {
                                        cb(window);
                                    });
                                });
                            } else {
                                res.clearCookie('remember_window');
                                cb(null);
                            }
                        }
                    );
                } else {
                    cb(null);
                }
            }

            checkRemember((user) => {
                if (user) {
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
    }

    let base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.windowUser = WindowUser.parse(req.session);
        next();
    }


    // 当日窓口フロー
    app.all('/window/login', 'window.mypage.login', base, (req, res, next) => {(new WindowAuthController(req, res, next)).login()});
    app.all('/window/logout', 'window.logout', base, (req, res, next) => {(new WindowAuthController(req, res, next)).logout()});
    app.all('/window/mypage', 'window.mypage', base, authentication, (req, res, next) => {(new WindowMyPageController(req, res, next)).index()});
    app.get('/window/mypage/search', 'window.mypage.search', base, authentication, (req, res, next) => {(new WindowMyPageController(req, res, next)).search()});
    app.get('/window/reserve/start', 'window.reserve.start', base, authentication, (req, res, next) => {(new WindowReserveController(req, res, next)).start()});
    app.all('/window/reserve/:token/terms', 'window.reserve.terms', base, authentication, (req, res, next) => {(new WindowReserveController(req, res, next)).terms()});
    app.all('/window/reserve/:token/performances', 'window.reserve.performances', base, authentication, (req, res, next) => {(new WindowReserveController(req, res, next)).performances()});
    app.all('/window/reserve/:token/seats', 'window.reserve.seats', base, authentication, (req, res, next) => {(new WindowReserveController(req, res, next)).seats()});
    app.all('/window/reserve/:token/tickets', 'window.reserve.tickets', base, authentication, (req, res, next) => {(new WindowReserveController(req, res, next)).tickets()});
    app.all('/window/reserve/:token/profile', 'window.reserve.profile', base, authentication, (req, res, next) => {(new WindowReserveController(req, res, next)).profile()});
    app.all('/window/reserve/:token/confirm', 'window.reserve.confirm', base, authentication, (req, res, next) => {(new WindowReserveController(req, res, next)).confirm()});
    app.get('/window/reserve/:paymentNo/complete', 'window.reserve.complete', base, authentication, (req, res, next) => {(new WindowReserveController(req, res, next)).complete()});
    app.post('/window/cancel/execute', 'window.cancel.execute', base, authentication, (req, res, next) => {(new WindowCancelController(req, res, next)).execute()});
}
