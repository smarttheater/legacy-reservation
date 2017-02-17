/**
 * 先行予約ルーター
 *
 * @function preRouter
 * @ignore
 */
import { Models } from '@motionpicture/ttts-domain';
import { NextFunction, Request, Response } from 'express';
import { Document } from 'mongoose';
import * as Util from '../../common/Util/Util';
import PreCustomerAuthController from '../controllers/PreCustomer/Auth/PreCustomerAuthController';
import PreCustomerReserveController from '../controllers/PreCustomer/Reserve/PreCustomerReserveController';
import PreCustomerUser from '../models/User/PreCustomerUser';

export default (app: any) => {
    const authenticationMiddleware = (req: Request, res: Response, next: NextFunction) => {
        if (!req.preCustomerUser) return next(new Error(req.__('Message.UnexpectedError')));

        if (!req.preCustomerUser.isAuthenticated()) {
            // 自動ログインチェック
            const checkRemember = (cb: (user: Document | null, locale: string | null) => void) => {
                if (req.cookies.remember_pre_customer) {
                    Models.Authentication.findOne(
                        {
                            token: req.cookies.remember_pre_customer,
                            pre_customer: { $ne: null }
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
                                        if (updateErr) cb(null, null);

                                        res.cookie('remember_pre_customer', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                        Models.PreCustomer.findOne({ _id: authentication.get('pre_customer') }, (findErr, preCustomer) => {
                                            (findErr) ? cb(null, null) : cb(preCustomer, authentication.get('locale'));
                                        });
                                    }
                                );
                            } else {
                                res.clearCookie('remember_pre_customer');
                                cb(null, null);
                            }
                        }
                    );
                } else {
                    cb(null, null);
                }
            };

            checkRemember((user, locale) => {
                if (user && req.session) {
                    // ログインしてリダイレクト
                    req.session[PreCustomerUser.AUTH_SESSION_NAME] = user.toObject();
                    req.session[PreCustomerUser.AUTH_SESSION_NAME].locale = locale;

                    // if exist parameter cb, redirect to cb.
                    res.redirect(req.originalUrl);
                } else {
                    if (req.xhr) {
                        res.json({
                            message: 'login required.'
                        });
                    } else {
                        res.redirect(`/pre/login?cb=${req.originalUrl}`);
                    }
                }
            });
        } else {
            // 言語設定
            req.setLocale((req.preCustomerUser.get('locale')) ? req.preCustomerUser.get('locale') : 'en');

            next();
        }
    };

    // tslint:disable-next-line:variable-name
    const baseMiddleware = (req: Request, _res: Response, next: NextFunction) => {
        req.preCustomerUser = PreCustomerUser.parse(req.session);
        next();
    };

    // 外部関係者
    app.all('/pre/login', 'pre.reserve.terms', baseMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerAuthController(req, res, next)).login(); });
    app.all('/pre/logout', 'pre.logout', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerAuthController(req, res, next)).logout(); });
    app.get('/pre/reserve/start', 'pre.reserve.start', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerReserveController(req, res, next)).start(); });
    app.all('/pre/reserve/:token/performances', 'pre.reserve.performances', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerReserveController(req, res, next)).performances(); });
    app.all('/pre/reserve/:token/seats', 'pre.reserve.seats', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerReserveController(req, res, next)).seats(); });
    app.all('/pre/reserve/:token/tickets', 'pre.reserve.tickets', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerReserveController(req, res, next)).tickets(); });
    app.all('/pre/reserve/:token/profile', 'pre.reserve.profile', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerReserveController(req, res, next)).profile(); });
    app.all('/pre/reserve/:token/confirm', 'pre.reserve.confirm', baseMiddleware, authenticationMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerReserveController(req, res, next)).confirm(); });
    app.get('/pre/reserve/:paymentNo/waitingSettlement', 'pre.reserve.waitingSettlement', baseMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerReserveController(req, res, next)).waitingSettlement(); });
    app.get('/pre/reserve/:paymentNo/complete', 'pre.reserve.complete', baseMiddleware, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerReserveController(req, res, next)).complete(); });
};
