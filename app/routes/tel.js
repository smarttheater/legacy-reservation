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
 * 電話窓口ルーター
 *
 * @function telRouter
 * @ignore
 */
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const Util = require("../../common/Util/Util");
const TelAuthController_1 = require("../controllers/Tel/Auth/TelAuthController");
const TelCancelController_1 = require("../controllers/Tel/Cancel/TelCancelController");
const TelMyPageController_1 = require("../controllers/Tel/MyPage/TelMyPageController");
const TelReserveController_1 = require("../controllers/Tel/Reserve/TelReserveController");
const TelStaffUser_1 = require("../models/User/TelStaffUser");
exports.default = (app) => {
    const authentication = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        if (req.telStaffUser === undefined) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }
        // 既ログインの場合
        if (req.telStaffUser.isAuthenticated()) {
            // 言語設定
            if (req.telStaffUser.get('locale') !== undefined && req.telStaffUser.get('locale') !== null) {
                req.setLocale(req.telStaffUser.get('locale'));
            }
            next();
            return;
        }
        // 自動ログインチェック
        const checkRemember = () => __awaiter(this, void 0, void 0, function* () {
            if (req.cookies.remember_tel_staff === undefined) {
                return null;
            }
            try {
                const authenticationDoc = yield chevre_domain_1.Models.Authentication.findOne({
                    token: req.cookies.remember_tel_staff,
                    tel_staff: { $ne: null }
                }).exec();
                if (authenticationDoc === null) {
                    res.clearCookie('remember_tel_staff');
                    return null;
                }
                // トークン再生成
                const token = Util.createToken();
                yield authenticationDoc.update({ token: token }).exec();
                // tslint:disable-next-line:no-cookies
                res.cookie('remember_tel_staff', token, { path: '/', httpOnly: true, maxAge: 604800000 });
                return yield chevre_domain_1.Models.TelStaff.findOne({ _id: authenticationDoc.get('tel_staff') }).exec();
            }
            catch (error) {
                return null;
            }
        });
        const user = yield checkRemember();
        if (user !== null && req.session !== undefined) {
            // ログインしてリダイレクト
            req.session[TelStaffUser_1.default.AUTH_SESSION_NAME] = user.toObject();
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
                res.redirect(`/tel/login?cb=${req.originalUrl}`);
            }
        }
    });
    // tslint:disable-next-line:variable-name
    const base = (req, _res, next) => {
        // 基本的に日本語
        req.setLocale('ja');
        req.telStaffUser = TelStaffUser_1.default.parse(req.session);
        next();
    };
    // 電話窓口フロー
    // tslint:disable:max-line-length
    app.all('/tel/login', 'tel.mypage.login', base, (req, res, next) => { (new TelAuthController_1.default(req, res, next)).login(); });
    app.all('/tel/logout', 'tel.logout', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelAuthController_1.default(req, res, next)).logout(); }));
    app.all('/tel/mypage', 'tel.mypage', base, authentication, (req, res, next) => { (new TelMyPageController_1.default(req, res, next)).index(); });
    app.get('/tel/mypage/search', 'tel.mypage.search', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelMyPageController_1.default(req, res, next)).search(); }));
    app.get('/tel/reserve/start', 'tel.reserve.start', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelReserveController_1.default(req, res, next)).start(); }));
    app.all('/tel/reserve/:token/terms', 'tel.reserve.terms', base, authentication, (req, res, next) => { (new TelReserveController_1.default(req, res, next)).terms(); });
    app.all('/tel/reserve/:token/performances', 'tel.reserve.performances', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelReserveController_1.default(req, res, next)).performances(); }));
    app.all('/tel/reserve/:token/seats', 'tel.reserve.seats', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelReserveController_1.default(req, res, next)).seats(); }));
    app.all('/tel/reserve/:token/tickets', 'tel.reserve.tickets', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelReserveController_1.default(req, res, next)).tickets(); }));
    app.all('/tel/reserve/:token/profile', 'tel.reserve.profile', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelReserveController_1.default(req, res, next)).profile(); }));
    app.all('/tel/reserve/:token/confirm', 'tel.reserve.confirm', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelReserveController_1.default(req, res, next)).confirm(); }));
    app.get('/tel/reserve/:paymentNo/complete', 'tel.reserve.complete', base, authentication, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new TelReserveController_1.default(req, res, next)).complete(); }));
    app.post('/tel/cancel/execute', 'tel.cancel.execute', base, authentication, (req, res, next) => { (new TelCancelController_1.default(req, res, next)).execute(); });
    app.post('/tel/cancel2sagyo/execute', 'tel.cancel2sagyo.execute', base, authentication, (req, res, next) => { (new TelCancelController_1.default(req, res, next)).execute2sagyo(); });
};
