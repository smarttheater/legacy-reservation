"use strict";
/**
 * デフォルトルーター
 *
 * @function router
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const reserve_1 = require("../controllers/customer/reserve");
const errorController = require("../controllers/error");
const gmoController = require("../controllers/gmo");
const reserve_2 = require("../controllers/gmo/reserve");
const languageController = require("../controllers/language");
const otherController = require("../controllers/other");
const reserve_3 = require("../controllers/reserve");
/**
 * URLルーティング
 *
 * app.get(パス, ルーティング名称, メソッド);
 * といった形でルーティングを登録する
 * ルーティング名称は、ejs側やコントローラーでURLを生成する際に用いたりするので、意識的にページ一意な値を定めること
 *
 * リクエスト毎に、req,res,nextでコントローラーインスタンスを生成して、URLに応じたメソッドを実行する、という考え方
 */
exports.default = (app) => {
    // tslint:disable-next-line:variable-name
    const base = (_req, _res, next) => {
        next();
    };
    // tslint:disable:max-line-length
    // 言語
    app.get('/language/update/:locale', base, languageController.update);
    app.get('/reserve/:token/getSeatProperties', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_3.default(req, res, next)).getSeatProperties(); }));
    app.get('/reserve/:performanceId/unavailableSeatCodes', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_3.default(req, res, next)).getUnavailableSeatCodes(); }));
    app.get('/reserve/print', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_3.default(req, res, next)).print(); }));
    // GMOプロセス
    app.post('/GMO/reserve/:token/start', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_2.default(req, res, next)).start(); }));
    app.post('/GMO/reserve/result', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_2.default(req, res, next)).result(); }));
    app.get('/GMO/reserve/:orderId/cancel', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_2.default(req, res, next)).cancel(); }));
    app.all('/GMO/notify', base, gmoController.notify);
    app.get('/policy', base, otherController.policy);
    app.get('/privacy', base, otherController.privacy);
    app.get('/commercialTransactions', base, otherController.commercialTransactions);
    // 一般
    // 本番環境ではhomeは存在しない
    if (process.env.NODE_ENV !== 'production') {
        app.all('/customer/reserve/performances', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).performances(); }));
    }
    app.get('/customer/reserve/start', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).start(); }));
    app.all('/customer/reserve/:token/terms', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).terms(); }));
    app.all('/customer/reserve/:token/seats', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).seats(); }));
    app.all('/customer/reserve/:token/tickets', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).tickets(); }));
    app.all('/customer/reserve/:token/profile', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).profile(); }));
    app.all('/customer/reserve/:token/confirm', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).confirm(); }));
    app.get('/customer/reserve/:performanceDay/:paymentNo/waitingSettlement', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).waitingSettlement(); }));
    app.get('/customer/reserve/:performanceDay/:paymentNo/complete', base, (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).complete(); }));
    app.get('/error/notFound', base, errorController.notFound);
    // 404
    app.use((__, res) => {
        res.redirect('/error/notFound');
    });
    // error handlers
    app.use((err, req, res, next) => {
        req.route.path = '/error/error';
        errorController.index(err, req, res, next);
    });
};
