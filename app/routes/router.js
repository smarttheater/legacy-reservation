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
const gmoReserveController = require("../controllers/gmo/reserve");
const languageController = require("../controllers/language");
const otherController = require("../controllers/other");
const reserveController = require("../controllers/reserve");
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
    // tslint:disable:max-line-length
    // 言語
    app.get('/language/update/:locale', languageController.update);
    app.get('/reserve/:token/getSeatProperties', reserveController.getSeatProperties);
    app.get('/reserve/:performanceId/unavailableSeatCodes', reserveController.getUnavailableSeatCodes);
    app.get('/reserve/print', reserveController.print);
    // GMOプロセス
    app.post('/GMO/reserve/:token/start', gmoReserveController.start);
    app.post('/GMO/reserve/result', gmoReserveController.result);
    app.get('/GMO/reserve/:orderId/cancel', gmoReserveController.cancel);
    app.all('/GMO/notify', gmoController.notify);
    app.get('/policy', otherController.policy);
    app.get('/privacy', otherController.privacy);
    app.get('/commercialTransactions', otherController.commercialTransactions);
    // 一般
    // 本番環境ではhomeは存在しない
    if (process.env.NODE_ENV !== 'production') {
        app.all('/customer/reserve/performances', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).performances(); }));
    }
    app.get('/customer/reserve/start', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).start(); }));
    app.all('/customer/reserve/:token/terms', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).terms(); }));
    app.all('/customer/reserve/:token/seats', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).seats(); }));
    app.all('/customer/reserve/:token/tickets', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).tickets(); }));
    app.all('/customer/reserve/:token/profile', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).profile(); }));
    app.all('/customer/reserve/:token/confirm', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).confirm(); }));
    app.get('/customer/reserve/:performanceDay/:paymentNo/waitingSettlement', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).waitingSettlement(); }));
    app.get('/customer/reserve/:performanceDay/:paymentNo/complete', (req, res, next) => __awaiter(this, void 0, void 0, function* () { yield (new reserve_1.default(req, res, next)).complete(); }));
    app.get('/error/notFound', errorController.notFound);
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
