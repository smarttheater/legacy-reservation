import express = require('express');

import PreCustomerAuthController from '../controllers/PreCustomer/Auth/PreCustomerAuthController';
import PreCustomerReserveController from '../controllers/PreCustomer/Reserve/PreCustomerReserveController';
import Models from '../../common/models/Models';
import Util from '../../common/Util/Util';

import PreCustomerUser from '../models/User/PreCustomerUser';

export default (app: any) => {
    let authentication = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.preCustomerUser.isAuthenticated()) {
            // 自動ログインチェック
            let checkRemember = (cb: (user, locale) => void) => {
                if (req.cookies.remember_pre_customer) {
                    Models.Authentication.findOne(
                        {
                            token: req.cookies.remember_pre_customer,
                            pre_customer: {$ne: null}
                        },
                        (err, authentication) => {
                            if (authentication) {
                                // トークン再生成
                                let token = Util.createToken();
                                authentication.update({
                                    token: token
                                }, (err, raw) => {
                                    if (err) cb(null, null);

                                    res.cookie('remember_pre_customer', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                    Models.PreCustomer.findOne({_id: authentication.get('pre_customer')}, (err, preCustomer) => {
                                        cb(preCustomer, authentication.get('locale'));
                                    });
                                });
                            } else {
                                res.clearCookie('remember_pre_customer');
                                cb(null, null);
                            }
                        }
                    );
                } else {
                    cb(null, null);
                }
            }

            checkRemember((user, locale) => {
                if (user) {
                    // ログインしてリダイレクト
                    req.session[PreCustomerUser.AUTH_SESSION_NAME] = user.toObject();
                    req.session[PreCustomerUser.AUTH_SESSION_NAME]['locale'] = locale;

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
    }

    let base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.preCustomerUser = PreCustomerUser.parse(req.session);
        next();
    }

    // 外部関係者
    app.all('/pre/login', 'pre.reserve.terms', base, (req, res, next) => {(new PreCustomerAuthController(req, res, next)).login()});
    app.all('/pre/logout', 'pre.logout', base, authentication, (req, res, next) => {(new PreCustomerAuthController(req, res, next)).logout()});
    app.get('/pre/reserve/start', 'pre.reserve.start', base, authentication, (req, res, next) => {(new PreCustomerReserveController(req, res, next)).start()});
    app.all('/pre/reserve/:token/performances', 'pre.reserve.performances', base, authentication, (req, res, next) => {(new PreCustomerReserveController(req, res, next)).performances()});
    app.all('/pre/reserve/:token/seats', 'pre.reserve.seats', base, authentication, (req, res, next) => {(new PreCustomerReserveController(req, res, next)).seats()});
    app.all('/pre/reserve/:token/tickets', 'pre.reserve.tickets', base, authentication, (req, res, next) => {(new PreCustomerReserveController(req, res, next)).tickets()});
    app.all('/pre/reserve/:token/profile', 'pre.reserve.profile', base, authentication, (req, res, next) => {(new PreCustomerReserveController(req, res, next)).profile()});
    app.all('/pre/reserve/:token/confirm', 'pre.reserve.confirm', base, authentication, (req, res, next) => {(new PreCustomerReserveController(req, res, next)).confirm()});
    app.get('/pre/reserve/:paymentNo/waitingSettlement', 'pre.reserve.waitingSettlement', base, (req, res, next) => {(new PreCustomerReserveController(req, res, next)).waitingSettlement()});
    app.get('/pre/reserve/:paymentNo/complete', 'pre.reserve.complete', base, (req, res, next) => {(new PreCustomerReserveController(req, res, next)).complete()});
}
