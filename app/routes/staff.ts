/**
 * 内部関係者ルーター
 *
 * @function routes/staff
 * @ignore
 */

import { CommonUtil, Models } from '@motionpicture/chevre-domain';
import { Application, NextFunction, Request, Response } from 'express';
import * as staffAuthController from '../controllers/staff/auth';
import * as staffCancelController from '../controllers/staff/cancel';
import * as staffMyPageController from '../controllers/staff/mypage';
import * as staffReserveController from '../controllers/staff/reserve';
import StaffUser from '../models/user/staff';

export default (app: Application) => {
    const authentication = async (req: Request, res: Response, next: NextFunction) => {
        if (req.staffUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }

        // 既ログインの場合
        if (req.staffUser.isAuthenticated()) {
            // 言語設定
            if (req.staffUser.get('locale') !== undefined && req.staffUser.get('locale') !== null) {
                req.setLocale(req.staffUser.get('locale'));
            }

            next();
            return;
        }

        // 自動ログインチェック
        const checkRemember = async () => {
            if (req.cookies.remember_staff === undefined) {
                return null;
            }

            try {
                const authenticationDoc = await Models.Authentication.findOne(
                    {
                        token: req.cookies.remember_staff,
                        staff: { $ne: null }
                    }
                ).exec();

                if (authenticationDoc === null) {
                    res.clearCookie('remember_staff');
                    return null;
                }

                // トークン再生成
                const token = CommonUtil.createToken();
                await authenticationDoc.update({ token: token }).exec();

                // tslint:disable-next-line:no-cookies
                res.cookie('remember_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                const staff = await Models.Staff.findOne({ _id: authenticationDoc.get('staff') }).exec();
                return {
                    staff: staff,
                    signature: authenticationDoc.get('signature'),
                    locale: authenticationDoc.get('locale')
                };
            } catch (error) {
                return null;
            }
        };

        const userSession = await checkRemember();
        if (userSession !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[StaffUser.AUTH_SESSION_NAME] = userSession.staff.toObject();
            req.session[StaffUser.AUTH_SESSION_NAME].signature = userSession.signature;
            req.session[StaffUser.AUTH_SESSION_NAME].locale = userSession.locale;
            res.redirect(req.originalUrl);
        } else {
            if (req.xhr) {
                res.json({
                    success: false,
                    message: 'login required'
                });
            } else {
                res.redirect(`/staff/login?cb=${req.originalUrl}`);
            }
        }
    };

    const base = (req: Request, __: Response, next: NextFunction) => {
        req.staffUser = StaffUser.parse(req.session);
        next();
    };

    app.all('/staff/login', base, staffAuthController.login);
    app.all('/staff/logout', base, staffAuthController.logout);
    app.all('/staff/mypage', base, authentication, staffMyPageController.index);
    app.get('/staff/mypage/search', base, authentication, staffMyPageController.search);
    app.post('/staff/mypage/updateWatcherName', base, authentication, staffMyPageController.updateWatcherName);
    app.get('/staff/reserve/start', base, authentication, staffReserveController.start);
    app.all('/staff/reserve/:token/terms', base, authentication, staffReserveController.terms);
    app.all('/staff/reserve/:token/performances', base, authentication, staffReserveController.performances);
    app.all('/staff/reserve/:token/seats', base, authentication, staffReserveController.seats);
    app.all('/staff/reserve/:token/tickets', base, authentication, staffReserveController.tickets);
    app.all('/staff/reserve/:token/profile', base, authentication, staffReserveController.profile);
    app.all('/staff/reserve/:token/confirm', base, authentication, staffReserveController.confirm);
    app.get('/staff/reserve/:performanceDay/:paymentNo/complete', base, authentication, staffReserveController.complete);
    app.post('/staff/cancel/execute', base, authentication, staffCancelController.execute);
    app.all('/staff/mypage/release', base, authentication, staffMyPageController.release);
};
