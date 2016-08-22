import express = require('express');

import StaffAuthController from '../controllers/Staff/Auth/StaffAuthController';
import StaffCancelController from '../controllers/Staff/Cancel/StaffCancelController';
import StaffMyPageController from '../controllers/Staff/MyPage/StaffMyPageController';
import StaffReserveController from '../controllers/Staff/Reserve/StaffReserveController';

import StaffUser from '../models/User/StaffUser';

export default (app: any) => {
    let authentication = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!req.staffUser.isAuthenticated()) {
            if (req.xhr) {
                res.json({
                    message: 'login required.'
                });
            } else {
                res.redirect(`/staff/login?cb=${req.originalUrl}`);
            }
        } else {
            // 言語設定
            req.setLocale((req.staffUser.get('locale')) ? req.staffUser.get('locale') : 'en');

            next();
        }
    }


    let base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        req.staffUser = StaffUser.parse(req.session);
        next();
    }






    // 内部関係者
    app.all('/staff/login', 'staff.mypage.login', base, (req, res, next) => {(new StaffAuthController(req, res, next)).login()});
    app.all('/staff/logout', 'staff.logout', base, (req, res, next) => {(new StaffAuthController(req, res, next)).logout()});
    app.all('/staff/mypage', 'staff.mypage', base, authentication, (req, res, next) => {(new StaffMyPageController(req, res, next)).index()});
    app.get('/staff/mypage/search', 'staff.mypage.search', base, authentication, (req, res, next) => {(new StaffMyPageController(req, res, next)).search()});
    app.post('/staff/mypage/updateWatcherName', 'staff.mypage.updateWatcherName', base, authentication, (req, res, next) => {(new StaffMyPageController(req, res, next)).updateWatcherName()});
    app.get('/staff/reserve/start', 'staff.reserve.start', base, authentication, (req, res, next) => {(new StaffReserveController(req, res, next)).start()});
    app.all('/staff/reserve/:token/terms', 'staff.reserve.terms', base, authentication, (req, res, next) => {(new StaffReserveController(req, res, next)).terms()});
    app.all('/staff/reserve/:token/performances', 'staff.reserve.performances', base, authentication, (req, res, next) => {(new StaffReserveController(req, res, next)).performances()});
    app.all('/staff/reserve/:token/seats', 'staff.reserve.seats', base, authentication, (req, res, next) => {(new StaffReserveController(req, res, next)).seats()});
    app.all('/staff/reserve/:token/tickets', 'staff.reserve.tickets', base, authentication, (req, res, next) => {(new StaffReserveController(req, res, next)).tickets()});
    app.all('/staff/reserve/:token/profile', 'staff.reserve.profile', base, authentication, (req, res, next) => {(new StaffReserveController(req, res, next)).profile()});
    app.all('/staff/reserve/:token/confirm', 'staff.reserve.confirm', base, authentication, (req, res, next) => {(new StaffReserveController(req, res, next)).confirm()});
    app.get('/staff/reserve/:paymentNo/complete', 'staff.reserve.complete', base, authentication, (req, res, next) => {(new StaffReserveController(req, res, next)).complete()});
    app.post('/staff/cancel/execute', 'staff.cancel.execute', base, authentication, (req, res, next) => {(new StaffCancelController(req, res, next)).execute()});
    app.all('/staff/mypage/release', 'staff.mypage.release', base, authentication, (req, res, next) => {(new StaffMyPageController(req, res, next)).release()});
}
