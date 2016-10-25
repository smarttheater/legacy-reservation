import express = require('express');

import TelAuthController from '../controllers/Tel/Auth/TelAuthController';
import TelMyPageController from '../controllers/Tel/MyPage/TelMyPageController';
import TelReserveController from '../controllers/Tel/Reserve/TelReserveController';
import TelCancelController from '../controllers/Tel/Cancel/TelCancelController';
import Models from '../../common/models/Models';
import Util from '../../common/Util/Util';

import TelStaffUser from '../models/User/TelStaffUser';

export default (app: any) => {
    let authentication = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.telStaffUser.isAuthenticated()) {
            // 自動ログインチェック
            let checkRemember = (cb: (user) => void) => {
                if (req.cookies.remember_tel_staff) {
                    Models.Authentication.findOne(
                        {
                            token: req.cookies.remember_tel_staff,
                            tel_staff: {$ne: null}
                        },
                        (err, authentication) => {
                            if (authentication) {
                                // トークン再生成
                                let token = Util.createToken();
                                authentication.update({
                                    token: token
                                }, (err, raw) => {
                                    if (err) cb(null);

                                    res.cookie('remember_tel_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                                    Models.TelStaff.findOne({_id: authentication.get('tel_staff')}, (err, telStaff) => {
                                        cb(telStaff);
                                    });
                                });
                            } else {
                                res.clearCookie('remember_tel_staff');
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
    }

    let base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.telStaffUser = TelStaffUser.parse(req.session);
        next();
    }


    // 電話窓口フロー
    app.all('/tel/login', 'tel.mypage.login', base, (req, res, next) => {(new TelAuthController(req, res, next)).login()});
    app.all('/tel/logout', 'tel.logout', base, (req, res, next) => {(new TelAuthController(req, res, next)).logout()});
    app.all('/tel/mypage', 'tel.mypage', base, authentication, (req, res, next) => {(new TelMyPageController(req, res, next)).index()});
    app.get('/tel/mypage/search', 'tel.mypage.search', base, authentication, (req, res, next) => {(new TelMyPageController(req, res, next)).search()});
    app.get('/tel/reserve/start', 'tel.reserve.start', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).start()});
    app.all('/tel/reserve/:token/terms', 'tel.reserve.terms', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).terms()});
    app.all('/tel/reserve/:token/performances', 'tel.reserve.performances', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).performances()});
    app.all('/tel/reserve/:token/seats', 'tel.reserve.seats', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).seats()});
    app.all('/tel/reserve/:token/tickets', 'tel.reserve.tickets', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).tickets()});
    app.all('/tel/reserve/:token/profile', 'tel.reserve.profile', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).profile()});
    app.all('/tel/reserve/:token/confirm', 'tel.reserve.confirm', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).confirm()});
    app.get('/tel/reserve/:paymentNo/complete', 'tel.reserve.complete', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).complete()});
    app.post('/tel/cancel/execute', 'tel.cancel.execute', base, authentication, (req, res, next) => {(new TelCancelController(req, res, next)).execute()});
    app.post('/tel/cancel2sagyo/execute', 'tel.cancel2sagyo.execute', base, authentication, (req, res, next) => {(new TelCancelController(req, res, next)).execute2sagyo()});
}
