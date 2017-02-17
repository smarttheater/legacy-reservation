import * as express from 'express';
import * as mongoose from 'mongoose';

import { Models } from '@motionpicture/ttts-domain';
import Util from '../../common/Util/Util';
import TelAuthController from '../controllers/Tel/Auth/TelAuthController';
import TelCancelController from '../controllers/Tel/Cancel/TelCancelController';
import TelMyPageController from '../controllers/Tel/MyPage/TelMyPageController';
import TelReserveController from '../controllers/Tel/Reserve/TelReserveController';

import TelStaffUser from '../models/User/TelStaffUser';

export default (app: any) => {
    const authenticationMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.telStaffUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb: (user: mongoose.Document) => void) => {
                if (req.cookies.remember_tel_staff) {
                    Models.Authentication.findOne(
                        {
                            token: req.cookies.remember_tel_staff,
                            tel_staff: { $ne: null }
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
                                    (updateRrr) => {
                                        if (updateRrr) return cb(null);

                                        res.cookie('remember_tel_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                        Models.TelStaff.findOne({ _id: authentication.get('tel_staff') }, (findErr, telStaff) => {
                                            (findErr) ? cb(null) : cb(telStaff);
                                        });
                                    }
                                );
                            } else {
                                res.clearCookie('remember_tel_staff');
                                cb(null);
                            }
                        }
                    );
                } else {
                    cb(null);
                }
            };

            checkRemember((user) => {
                if (user) {
                    // ログインしてリダイレクト
                    req.session[TelStaffUser.AUTH_SESSION_NAME] = user.toObject();

                    // if exist parameter cb, redirect to cb.
                    res.redirect(req.originalUrl);
                } else {
                    if (req.xhr) {
                        res.json({
                            message: 'login required.'
                        });
                    } else {
                        res.redirect(`/tel/login?cb=${req.originalUrl}`);
                    }
                }
            });
        } else {
            // 言語設定
            req.setLocale((req.telStaffUser.get('locale')) ? req.telStaffUser.get('locale') : 'ja');

            next();
        }
    };

    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.telStaffUser = TelStaffUser.parse(req.session);
        next();
    };

    // 電話窓口フロー
    app.all('/tel/login', 'tel.mypage.login', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelAuthController(req, res, next)).login(); });
    app.all('/tel/logout', 'tel.logout', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelAuthController(req, res, next)).logout(); });
    app.all('/tel/mypage', 'tel.mypage', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelMyPageController(req, res, next)).index(); });
    app.get('/tel/mypage/search', 'tel.mypage.search', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelMyPageController(req, res, next)).search(); });
    app.get('/tel/reserve/start', 'tel.reserve.start', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelReserveController(req, res, next)).start(); });
    app.all('/tel/reserve/:token/terms', 'tel.reserve.terms', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelReserveController(req, res, next)).terms(); });
    app.all('/tel/reserve/:token/performances', 'tel.reserve.performances', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelReserveController(req, res, next)).performances(); });
    app.all('/tel/reserve/:token/seats', 'tel.reserve.seats', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelReserveController(req, res, next)).seats(); });
    app.all('/tel/reserve/:token/tickets', 'tel.reserve.tickets', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelReserveController(req, res, next)).tickets(); });
    app.all('/tel/reserve/:token/profile', 'tel.reserve.profile', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelReserveController(req, res, next)).profile(); });
    app.all('/tel/reserve/:token/confirm', 'tel.reserve.confirm', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelReserveController(req, res, next)).confirm(); });
    app.get('/tel/reserve/:paymentNo/complete', 'tel.reserve.complete', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelReserveController(req, res, next)).complete(); });
    app.post('/tel/cancel/execute', 'tel.cancel.execute', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelCancelController(req, res, next)).execute(); });
    app.post('/tel/cancel2sagyo/execute', 'tel.cancel2sagyo.execute', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new TelCancelController(req, res, next)).execute2sagyo(); });
};
