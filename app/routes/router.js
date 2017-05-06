"use strict";
/**
 * デフォルトルーター
 *
 * @function router
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const customerReserveController = require("../controllers/customer/reserve");
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
    app.get('/reserve/getSeatProperties', reserveController.getSeatProperties);
    app.get('/reserve/:performanceId/unavailableSeatCodes', reserveController.getUnavailableSeatCodes);
    app.get('/reserve/print', reserveController.print);
    // GMOプロセス
    app.post('/GMO/reserve/start', gmoReserveController.start);
    app.post('/GMO/reserve/result', gmoReserveController.result);
    app.get('/GMO/reserve/:orderId/cancel', gmoReserveController.cancel);
    app.all('/GMO/notify', gmoController.notify);
    app.get('/policy', otherController.policy);
    app.get('/privacy', otherController.privacy);
    app.get('/commercialTransactions', otherController.commercialTransactions);
    // 一般
    // 本番環境ではhomeは存在しない
    if (process.env.NODE_ENV !== 'production') {
        app.all('/customer/reserve/performances', customerReserveController.performances);
    }
    app.get('/customer/reserve/start', customerReserveController.start);
    app.all('/customer/reserve/terms', customerReserveController.terms);
    app.all('/customer/reserve/seats', customerReserveController.seats);
    app.all('/customer/reserve/tickets', customerReserveController.tickets);
    app.all('/customer/reserve/profile', customerReserveController.profile);
    app.all('/customer/reserve/confirm', customerReserveController.confirm);
    app.get('/customer/reserve/:performanceDay/:paymentNo/waitingSettlement', customerReserveController.waitingSettlement);
    app.get('/customer/reserve/:performanceDay/:paymentNo/complete', customerReserveController.complete);
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
