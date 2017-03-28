/**
 * 先行予約ルーター
 *
 * @function preRouter
 * @ignore
 */
import { Models } from '@motionpicture/chevre-domain';
import { NextFunction, Request, Response } from 'express';
import * as Util from '../../common/Util/Util';
import PreCustomerAuthController from '../controllers/PreCustomer/Auth/PreCustomerAuthController';
import PreCustomerReserveController from '../controllers/PreCustomer/Reserve/PreCustomerReserveController';
import PreCustomerUser from '../models/User/PreCustomerUser';

export default (app: any) => {
    const authentication = async (req: Request, res: Response, next: NextFunction) => {
        if (req.preCustomerUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }

        // 既ログインの場合
        if (req.preCustomerUser.isAuthenticated()) {
            // 言語設定
            if (req.preCustomerUser.get('locale') !== undefined && req.preCustomerUser.get('locale') !== null) {
                req.setLocale(req.preCustomerUser.get('locale'));
            }

            next();
            return;
        }

        // 自動ログインチェック
        const checkRemember = async () => {
            if (req.cookies.remember_pre_customer === undefined) {
                return null;
            }

            try {
                const authenticationDoc = await Models.Authentication.findOne(
                    {
                        token: req.cookies.remember_pre_customer,
                        pre_customer: { $ne: null }
                    }
                ).exec();

                if (authenticationDoc === null) {
                    res.clearCookie('remember_pre_customer');
                    return null;
                }

                // トークン再生成
                const token = Util.createToken();
                await authenticationDoc.update({ token: token }).exec();

                // tslint:disable-next-line:no-cookies
                res.cookie('remember_pre_customer', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                const preCustomer = await Models.PreCustomer.findOne({ _id: authenticationDoc.get('pre_customer') }).exec();
                return {
                    preCustomer: preCustomer,
                    locale: authenticationDoc.get('locale')
                };
            } catch (error) {
                return null;
            }
        };

        const userSession = await checkRemember();
        if (userSession !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[PreCustomerUser.AUTH_SESSION_NAME] = userSession.preCustomer.toObject();
            req.session[PreCustomerUser.AUTH_SESSION_NAME].locale = userSession.locale;
            res.redirect(req.originalUrl);
        } else {
            if (req.xhr) {
                res.json({
                    success: false,
                    message: 'login required'
                });
            } else {
                res.redirect(`/pre/login?cb=${req.originalUrl}`);
            }
        }
    };

    // tslint:disable-next-line:variable-name
    const base = (req: Request, _res: Response, next: NextFunction) => {
        req.preCustomerUser = PreCustomerUser.parse(req.session);
        next();
    };

    // 外部関係者
    // tslint:disable:max-line-length
    app.all('/pre/login', 'pre.reserve.terms', base, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerAuthController(req, res, next)).login(); });
    app.all('/pre/logout', 'pre.logout', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new PreCustomerAuthController(req, res, next)).logout(); });
    app.get('/pre/reserve/start', 'pre.reserve.start', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new PreCustomerReserveController(req, res, next)).start(); });
    app.all('/pre/reserve/:token/performances', 'pre.reserve.performances', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new PreCustomerReserveController(req, res, next)).performances(); });
    app.all('/pre/reserve/:token/seats', 'pre.reserve.seats', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new PreCustomerReserveController(req, res, next)).seats(); });
    app.all('/pre/reserve/:token/tickets', 'pre.reserve.tickets', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new PreCustomerReserveController(req, res, next)).tickets(); });
    app.all('/pre/reserve/:token/profile', 'pre.reserve.profile', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new PreCustomerReserveController(req, res, next)).profile(); });
    app.all('/pre/reserve/:token/confirm', 'pre.reserve.confirm', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new PreCustomerReserveController(req, res, next)).confirm(); });
    app.get('/pre/reserve/:paymentNo/waitingSettlement', 'pre.reserve.waitingSettlement', base, async (req: Request, res: Response, next: NextFunction) => { await (new PreCustomerReserveController(req, res, next)).waitingSettlement(); });
    app.get('/pre/reserve/:paymentNo/complete', 'pre.reserve.complete', base, async (req: Request, res: Response, next: NextFunction) => { await (new PreCustomerReserveController(req, res, next)).complete(); });
};
