import * as express from 'express';

import AdmissionController from '../controllers/Admission/AdmissionController';
import CustomerReserveController from '../controllers/Customer/Reserve/CustomerReserveController';
import ErrorController from '../controllers/Error/ErrorController';
import GMOController from '../controllers/GMO/GMOController';
import GMOReserveController from '../controllers/GMO/Reserve/GMOReserveController';
import LanguageController from '../controllers/Language/LanguageController';
import OtherController from '../controllers/Other/OtherController';
import ReserveController from '../controllers/Reserve/ReserveController';

/**
 * URLルーティング
 *
 * app.get(パス, ルーティング名称, メソッド);
 * といった形でルーティングを登録する
 * ルーティング名称は、ejs側やコントローラーでURLを生成する際に用いたりするので、意識的にページ一意な値を定めること
 *
 * リクエスト毎に、req,res,nextでコントローラーインスタンスを生成して、URLに応じたメソッドを実行する、という考え方
 */
export default (app: any) => {
    const base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        next();
    };

    // 言語
    app.get('/language/update/:locale', 'language.update', base, (req, res, next) => { (new LanguageController(req, res, next)).update(); });

    app.get('/reserve/:token/getSeatProperties', 'reserve.getSeatProperties', base, (req, res, next) => { (new ReserveController(req, res, next)).getSeatProperties(); });
    app.get('/reserve/:reservationId/qrcode', 'reserve.qrcode', base, (req, res, next) => { (new ReserveController(req, res, next)).qrcode(); });
    app.get('/reserve/:performanceId/unavailableSeatCodes', 'reserve.getUnavailableSeatCodes', base, (req, res, next) => { (new ReserveController(req, res, next)).getUnavailableSeatCodes(); });
    app.get('/reserve/print', 'reserve.print', base, (req, res, next) => { (new ReserveController(req, res, next)).print(); });

    // GMOプロセス
    app.post('/GMO/reserve/:token/start', 'gmo.reserve.start', base, (req, res, next) => { (new GMOReserveController(req, res, next)).start(); });
    app.post('/GMO/reserve/result', 'gmo.reserve.result', base, (req, res, next) => { (new GMOReserveController(req, res, next)).result(); });
    app.get('/GMO/reserve/:paymentNo/cancel', 'gmo.reserve.cancel', base, (req, res, next) => { (new GMOReserveController(req, res, next)).cancel(); });
    app.all('/GMO/notify', 'gmo.notify', base, (req, res, next) => { (new GMOController(req, res, next)).notify(); });

    // admission
    app.all('/admission/performances', 'admission.performances', base, (req, res, next) => { (new AdmissionController(req, res, next)).performances(); });
    app.get('/admission/performance/:id/confirm', 'admission.confirm', base, (req, res, next) => { (new AdmissionController(req, res, next)).confirm(); });

    app.get('/policy', 'policy', base, (req, res, next) => { (new OtherController(req, res, next)).policy(); });
    app.get('/privacy', 'privacy', base, (req, res, next) => { (new OtherController(req, res, next)).privacy(); });
    app.get('/commercialTransactions', 'commercialTransactions', base, (req, res, next) => { (new OtherController(req, res, next)).commercialTransactions(); });

    // 一般
    // 本番環境ではhomeは存在しない
    if (process.env.NODE_ENV !== 'prod') {
        app.all('/customer/reserve/performances', 'customer.reserve.performances', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).performances(); });
    }
    app.get('/customer/reserve/start', 'customer.reserve.start', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).start(); });
    app.all('/customer/reserve/:token/terms', 'customer.reserve.terms', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).terms(); });
    app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).seats(); });
    app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).tickets(); });
    app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).profile(); });
    app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).confirm(); });
    app.get('/customer/reserve/:paymentNo/waitingSettlement', 'customer.reserve.waitingSettlement', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).waitingSettlement(); });
    app.get('/customer/reserve/:paymentNo/complete', 'customer.reserve.complete', base, (req, res, next) => { (new CustomerReserveController(req, res, next)).complete(); });

    app.get('/error/notFound', 'error.notFound', base, (req, res, next) => { (new ErrorController(req, res, next)).notFound(); });

    // 404
    app.use((req, res, next) => {
        return res.redirect('/error/notFound');
    });

    // error handlers
    app.use((err: any, req, res, next) => {
        req.route.name = 'error.error';
        (new ErrorController(req, res, next)).index(err);
    });
};
