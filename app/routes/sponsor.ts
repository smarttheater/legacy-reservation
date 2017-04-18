/**
 * 外部関係者ルーター
 *
 * @function sponsorRouter
 * @ignore
 */
import { Models } from '@motionpicture/chevre-domain';
import { Application, NextFunction, Request, Response } from 'express';
import * as Util from '../../common/Util/Util';
import SponsorAuthController from '../controllers/Sponsor/Auth/SponsorAuthController';
import SponsorCancelController from '../controllers/Sponsor/Cancel/SponsorCancelController';
import SponsorMyPageController from '../controllers/Sponsor/MyPage/SponsorMyPageController';
import SponsorReserveController from '../controllers/Sponsor/Reserve/SponsorReserveController';
import SponsorUser from '../models/User/SponsorUser';

export default (app: Application) => {
    const authentication = async (req: Request, res: Response, next: NextFunction) => {
        if (req.sponsorUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }

        // 既ログインの場合
        if (req.sponsorUser.isAuthenticated()) {
            // 言語設定
            if (req.sponsorUser.get('locale') !== undefined && req.sponsorUser.get('locale') !== null) {
                req.setLocale(req.sponsorUser.get('locale'));
            }

            next();
            return;
        }

        // 自動ログインチェック
        const checkRemember = async () => {
            if (req.cookies.remember_sponsor === undefined) {
                return null;
            }

            try {
                const authenticationDoc = await Models.Authentication.findOne(
                    {
                        token: req.cookies.remember_sponsor,
                        sponsor: { $ne: null }
                    }
                ).exec();

                if (authenticationDoc === null) {
                    res.clearCookie('remember_sponsor');
                    return null;
                }

                // トークン再生成
                const token = Util.createToken();
                await authenticationDoc.update({ token: token }).exec();

                // tslint:disable-next-line:no-cookies
                res.cookie('remember_sponsor', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                const sponsor = await Models.Sponsor.findOne({ _id: authenticationDoc.get('sponsor') }).exec();
                return {
                    sponsor: sponsor,
                    locale: authenticationDoc.get('locale')
                };
            } catch (error) {
                return null;
            }
        };

        const userSession = await checkRemember();
        if (userSession !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[SponsorUser.AUTH_SESSION_NAME] = userSession.sponsor.toObject();
            req.session[SponsorUser.AUTH_SESSION_NAME].locale = userSession.locale;
            res.redirect(req.originalUrl);
        } else {
            if (req.xhr) {
                res.json({
                    success: false,
                    message: 'login required'
                });
            } else {
                res.redirect(`/sponsor/login?cb=${req.originalUrl}`);
            }
        }
    };

    // tslint:disable-next-line:variable-name
    const base = (req: Request, _res: Response, next: NextFunction) => {
        req.sponsorUser = SponsorUser.parse(req.session);
        next();
    };

    // 外部関係者
    // tslint:disable:max-line-length
    app.all('/sponsor/login', base, (req: Request, res: Response, next: NextFunction) => { (new SponsorAuthController(req, res, next)).login(); });
    app.all('/sponsor/logout', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorAuthController(req, res, next)).logout(); });
    app.all('/sponsor/mypage', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new SponsorMyPageController(req, res, next)).index(); });
    app.get('/sponsor/mypage/search', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorMyPageController(req, res, next)).search(); });
    app.get('/sponsor/reserve/start', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorReserveController(req, res, next)).start(); });
    app.all('/sponsor/reserve/:token/terms', base, authentication, (req: Request, res: Response, next: NextFunction) => { (new SponsorReserveController(req, res, next)).terms(); });
    app.all('/sponsor/reserve/:token/performances', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorReserveController(req, res, next)).performances(); });
    app.all('/sponsor/reserve/:token/seats', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorReserveController(req, res, next)).seats(); });
    app.all('/sponsor/reserve/:token/tickets', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorReserveController(req, res, next)).tickets(); });
    app.all('/sponsor/reserve/:token/profile', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorReserveController(req, res, next)).profile(); });
    app.all('/sponsor/reserve/:token/confirm', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorReserveController(req, res, next)).confirm(); });
    app.get('/sponsor/reserve/:paymentNo/complete', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorReserveController(req, res, next)).complete(); });
    app.post('/sponsor/cancel/execute', base, authentication, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorCancelController(req, res, next)).execute(); });
    // ↓ログイン不要
    app.all('/sponsor/cancel', base, (req: Request, res: Response, next: NextFunction) => { (new SponsorCancelController(req, res, next)).index(); });
    app.post('/sponsor/cancel/executeByPaymentNo', base, async (req: Request, res: Response, next: NextFunction) => { await (new SponsorCancelController(req, res, next)).executeByPaymentNo(); });
};
