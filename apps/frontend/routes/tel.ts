import express = require('express');

import TelAuthController from '../controllers/Tel/Auth/TelAuthController';
import TelMyPageController from '../controllers/Tel/MyPage/TelMyPageController';
import TelReserveController from '../controllers/Tel/Reserve/TelReserveController';
import TelCancelController from '../controllers/Tel/Cancel/TelCancelController';

import TelStaffUser from '../models/User/TelStaffUser';

export default (app: any) => {
    let authentication = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.telStaffUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            } else {
                res.redirect(`/tel/login?cb=${req.originalUrl}`);
            }
        } else {
            // 言語設定
            req.setLocale((req.telStaffUser.get('locale')) ? req.telStaffUser.get('locale') : 'ja');

            next();
        }
    }

    let base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.telStaffUser = TelStaffUser.parse(req.session);
        next();
    }


    // 電話窓口フロー
    app.all('/tel/login', 'tel.mypage.login', base, (req, res, next) => {(new TelAuthController(req, res, next)).login()});
    app.all('/tel/logout', 'tel.logout', base, (req, res, next) => {(new TelAuthController(req, res, next)).logout()});
    app.all('/tel/mypage', 'tel.mypage', base, authentication, (req, res, next) => {(new TelMyPageController(req, res, next)).index()});
    app.get('/tel/mypage/search', 'tel.mypage.search', base, authentication, (req, res, next) => {(new TelMyPageController(req, res, next)).search()});
    app.get('/tel/reserve/start', 'tel.reserve.start', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).start()});
    app.all('/tel/reserve/:token/performances', 'tel.reserve.performances', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).performances()});
    app.all('/tel/reserve/:token/seats', 'tel.reserve.seats', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).seats()});
    app.all('/tel/reserve/:token/tickets', 'tel.reserve.tickets', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).tickets()});
    app.all('/tel/reserve/:token/profile', 'tel.reserve.profile', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).profile()});
    app.all('/tel/reserve/:token/confirm', 'tel.reserve.confirm', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).confirm()});
    app.get('/tel/reserve/:paymentNo/complete', 'tel.reserve.complete', base, authentication, (req, res, next) => {(new TelReserveController(req, res, next)).complete()});
    app.post('/tel/cancel/execute', 'tel.cancel.execute', base, authentication, (req, res, next) => {(new TelCancelController(req, res, next)).execute()});
}
