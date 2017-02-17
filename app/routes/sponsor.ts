import * as express from 'express';
import * as mongoose from 'mongoose';

import { Models } from '@motionpicture/ttts-domain';
import Util from '../../common/Util/Util';
import SponsorAuthController from '../controllers/Sponsor/Auth/SponsorAuthController';
import SponsorCancelController from '../controllers/Sponsor/Cancel/SponsorCancelController';
import SponsorMyPageController from '../controllers/Sponsor/MyPage/SponsorMyPageController';
import SponsorReserveController from '../controllers/Sponsor/Reserve/SponsorReserveController';

import SponsorUser from '../models/User/SponsorUser';

export default (app: any) => {
    const authenticationMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.sponsorUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb: (user: mongoose.Document, locale: string) => void) => {
                if (req.cookies.remember_sponsor) {
                    Models.Authentication.findOne(
                        {
                            token: req.cookies.remember_sponsor,
                            sponsor: { $ne: null }
                        },
                        (err, authentication) => {
                            if (err) return cb(null, null);

                            if (authentication) {
                                // トークン再生成
                                const token = Util.createToken();
                                authentication.update(
                                    {
                                        token: token
                                    },
                                    (updateErr) => {
                                        if (updateErr) return cb(null, null);

                                        res.cookie('remember_sponsor', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                        Models.Sponsor.findOne({ _id: authentication.get('sponsor') }, (findErr, sponsor) => {
                                            (findErr) ? cb(null, null) : cb(sponsor, authentication.get('locale'));
                                        });
                                    }
                                );
                            } else {
                                res.clearCookie('remember_sponsor');
                                cb(null, null);
                            }
                        }
                    );
                } else {
                    cb(null, null);
                }
            };

            checkRemember((user, locale) => {
                if (user) {
                    // ログインしてリダイレクト
                    req.session[SponsorUser.AUTH_SESSION_NAME] = user.toObject();
                    req.session[SponsorUser.AUTH_SESSION_NAME].locale = locale;

                    // if exist parameter cb, redirect to cb.
                    res.redirect(req.originalUrl);
                } else {
                    if (req.xhr) {
                        res.json({
                            message: 'login required.'
                        });
                    } else {
                        res.redirect(`/sponsor/login?cb=${req.originalUrl}`);
                    }
                }
            });
        } else {
            // 言語設定
            req.setLocale((req.sponsorUser.get('locale')) ? req.sponsorUser.get('locale') : 'en');

            next();
        }
    };

    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        req.sponsorUser = SponsorUser.parse(req.session);
        next();
    };

    // 外部関係者
    app.all('/sponsor/login', 'sponsor.mypage.login', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorAuthController(req, res, next)).login(); });
    app.all('/sponsor/logout', 'sponsor.logout', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorAuthController(req, res, next)).logout(); });
    app.all('/sponsor/mypage', 'sponsor.mypage', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorMyPageController(req, res, next)).index(); });
    app.get('/sponsor/mypage/search', 'sponsor.mypage.search', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorMyPageController(req, res, next)).search(); });
    app.get('/sponsor/reserve/start', 'sponsor.reserve.start', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorReserveController(req, res, next)).start(); });
    app.all('/sponsor/reserve/:token/terms', 'sponsor.reserve.terms', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorReserveController(req, res, next)).terms(); });
    app.all('/sponsor/reserve/:token/performances', 'sponsor.reserve.performances', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorReserveController(req, res, next)).performances(); });
    app.all('/sponsor/reserve/:token/seats', 'sponsor.reserve.seats', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorReserveController(req, res, next)).seats(); });
    app.all('/sponsor/reserve/:token/tickets', 'sponsor.reserve.tickets', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorReserveController(req, res, next)).tickets(); });
    app.all('/sponsor/reserve/:token/profile', 'sponsor.reserve.profile', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorReserveController(req, res, next)).profile(); });
    app.all('/sponsor/reserve/:token/confirm', 'sponsor.reserve.confirm', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorReserveController(req, res, next)).confirm(); });
    app.get('/sponsor/reserve/:paymentNo/complete', 'sponsor.reserve.complete', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorReserveController(req, res, next)).complete(); });
    app.post('/sponsor/cancel/execute', 'sponsor.cancel.execute', baseMiddleware, authenticationMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorCancelController(req, res, next)).execute(); });
    // ↓ログイン不要
    app.all('/sponsor/cancel', 'sponsor.cancel', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorCancelController(req, res, next)).index(); });
    app.post('/sponsor/cancel/executeByPaymentNo', 'sponsor.cancel.executeByPaymentNo', baseMiddleware, (req: express.Request, res: express.Response, next: express.NextFunction) => { (new SponsorCancelController(req, res, next)).executeByPaymentNo(); });
};
