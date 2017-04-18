"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 外部関係者ルーター
 *
 * @function sponsorRouter
 * @ignore
 */
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../common/Util/Util");
const SponsorAuthController_1 = require("../controllers/Sponsor/Auth/SponsorAuthController");
const SponsorCancelController_1 = require("../controllers/Sponsor/Cancel/SponsorCancelController");
const SponsorMyPageController_1 = require("../controllers/Sponsor/MyPage/SponsorMyPageController");
const SponsorReserveController_1 = require("../controllers/Sponsor/Reserve/SponsorReserveController");
const SponsorUser_1 = require("../models/User/SponsorUser");
exports.default = (app) => {
    const authentication = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
        const checkRemember = () => __awaiter(this, void 0, void 0, function* () {
            if (req.cookies.remember_sponsor === undefined) {
                return null;
            }
            try {
                const authenticationDoc = yield chevre_domain_1.Models.Authentication.findOne({
                    token: req.cookies.remember_sponsor,
                    sponsor: { $ne: null }
                }).exec();
                if (authenticationDoc === null) {
                    res.clearCookie('remember_sponsor');
                    return null;
                }
                // トークン再生成
                const token = Util.createToken();
                yield authenticationDoc.update({ token: token }).exec();
                // tslint:disable-next-line:no-cookies
                res.cookie('remember_sponsor', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                const sponsor = yield chevre_domain_1.Models.Sponsor.findOne({ _id: authenticationDoc.get('sponsor') }).exec();
                return {
                    sponsor: sponsor,
                    locale: authenticationDoc.get('locale')
                };
            }
            catch (error) {
                return null;
            }
        });
        const userSession = yield checkRemember();
        if (userSession !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[SponsorUser_1.default.AUTH_SESSION_NAME] = userSession.sponsor.toObject();
            req.session[SponsorUser_1.default.AUTH_SESSION_NAME].locale = userSession.locale;
            res.redirect(req.originalUrl);
        }
        else {
            if (req.xhr) {
                res.json({
                    success: false,
                    message: 'login required'
                });
            }
            else {
                res.redirect(`/sponsor/login?cb=${req.originalUrl}`);
            }
        }
    });
    // tslint:disable-next-line:variable-name
    const base = (req, _res, next) => {
        req.sponsorUser = SponsorUser_1.default.parse(req.session);
        next();
    };
    // 外部関係者
    // tslint:disable:max-line-length
    app.all('/sponsor/login', base, (req, res, next) => { (new SponsorAuthController_1.default(req, res, next)).login(); });
    app.all('/sponsor/logout', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorAuthController_1.default(req, res, next)).logout(); }));
    app.all('/sponsor/mypage', base, authentication, (req, res, next) => { (new SponsorMyPageController_1.default(req, res, next)).index(); });
    app.get('/sponsor/mypage/search', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorMyPageController_1.default(req, res, next)).search(); }));
    app.get('/sponsor/reserve/start', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorReserveController_1.default(req, res, next)).start(); }));
    app.all('/sponsor/reserve/:token/terms', base, authentication, (req, res, next) => { (new SponsorReserveController_1.default(req, res, next)).terms(); });
    app.all('/sponsor/reserve/:token/performances', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorReserveController_1.default(req, res, next)).performances(); }));
    app.all('/sponsor/reserve/:token/seats', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorReserveController_1.default(req, res, next)).seats(); }));
    app.all('/sponsor/reserve/:token/tickets', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorReserveController_1.default(req, res, next)).tickets(); }));
    app.all('/sponsor/reserve/:token/profile', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorReserveController_1.default(req, res, next)).profile(); }));
    app.all('/sponsor/reserve/:token/confirm', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorReserveController_1.default(req, res, next)).confirm(); }));
    app.get('/sponsor/reserve/:paymentNo/complete', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorReserveController_1.default(req, res, next)).complete(); }));
    app.post('/sponsor/cancel/execute', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorCancelController_1.default(req, res, next)).execute(); }));
    // ↓ログイン不要
    app.all('/sponsor/cancel', base, (req, res, next) => { (new SponsorCancelController_1.default(req, res, next)).index(); });
    app.post('/sponsor/cancel/executeByPaymentNo', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new SponsorCancelController_1.default(req, res, next)).executeByPaymentNo(); }));
};
