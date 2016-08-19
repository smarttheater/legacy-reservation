import express = require('express');

import AdmissionController from '../controllers/Admission/AdmissionController';
import GMOReserveController from  '../controllers/GMO/Reserve/GMOReserveController';
import ReserveController from '../controllers/Reserve/ReserveController';
import LanguageController from '../controllers/Language/LanguageController';

import CustomerReserveController from '../controllers/Customer/Reserve/CustomerReserveController';

import ErrorController from '../controllers/Error/ErrorController';
import IndexController from '../controllers/Index/IndexController';


/**
 * URLルーティング
 * 
 * app.get(パス, ルーティング名称, メソッド);
 * といった形でルーティングを登録する
 * ルーティング名称は、ejs側やコントローラーでURLを生成する際に用いたりするので、意識的にページ一意な値を定めること
 * 
 * リクエスト毎に、req,res,nextでコントローラーインスタンスを生成して、URLに応じたメソッドを実行する、という考え方
 * 
 * メタタグ情報は./metas.jsonで管理しています
 */
export default (app: any) => {
    let base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        next();
    }

    app.get('/', 'Home', base, (req, res, next) => {(new IndexController(req, res, next)).index()});

    // 言語
    app.get('/language/update/:locale', 'language.update', base, (req, res, next) => {(new LanguageController(req, res, next)).update()});

    app.get('/reserve/:token/getSeatProperties', 'reserve.getSeatProperties', base, (req, res, next) => {(new ReserveController(req, res, next)).getSeatProperties()});
    app.get('/reserve/:reservationId/barcode', 'reserve.barcode', base, (req, res, next) => {(new ReserveController(req, res, next)).barcode()});
    app.get('/reserve/:reservationId/qrcode', 'reserve.qrcode', base, (req, res, next) => {(new ReserveController(req, res, next)).qrcode()});


    // GMOプロセス
    app.post('/GMO/reserve/:token/start', 'gmo.reserve.start', base, (req, res, next) => {(new GMOReserveController(req, res, next)).start()});
    app.post('/GMO/reserve/result', 'gmo.reserve.result', base, (req, res, next) => {(new GMOReserveController(req, res, next)).result()});
    app.all('/GMO/reserve/notify', 'gmo.reserve.notify', base, (req, res, next) => {(new GMOReserveController(req, res, next)).notify()});
    app.all('/GMO/reserve/:paymentNo/cancel', 'gmo.reserve.cancel', base, (req, res, next) => {(new GMOReserveController(req, res, next)).cancel()});

    // ペイデザインプロセス
    app.all('/PayDesign/reserve/notify', 'paydesign.reserve.notify', base, (req, res, next) => {(new GMOReserveController(req, res, next)).notify()});
    app.all('/PayDesign/reserve/:paymentNo/cancel', 'paydesign.reserve.cancel', base, (req, res, next) => {(new GMOReserveController(req, res, next)).cancel()});


    // admission
    app.get('/admission/performances', 'admission.performances', base, (req, res, next) => {(new AdmissionController(req, res, next)).performances()});
    app.get('/admission/performance/:id/confirm', 'admission.confirm', base, (req, res, next) => {(new AdmissionController(req, res, next)).confirm()});
    







    // 一般
    app.all('/customer/reserve/performances', 'customer.reserve.performances', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).performances()});
    app.get('/customer/reserve/start', 'customer.reserve.start', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).start()});
    app.all('/customer/reserve/:token/terms', 'customer.reserve.terms', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).terms()});
    app.all('/customer/reserve/:token/seats', 'customer.reserve.seats', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).seats()});
    app.all('/customer/reserve/:token/tickets', 'customer.reserve.tickets', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).tickets()});
    app.all('/customer/reserve/:token/profile', 'customer.reserve.profile', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).profile()});
    app.all('/customer/reserve/:token/confirm', 'customer.reserve.confirm', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).confirm()});
    app.get('/customer/reserve/:paymentNo/waitingSettlement', 'customer.reserve.waitingSettlement', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).waitingSettlement()});
    app.get('/customer/reserve/:paymentNo/complete', 'customer.reserve.complete', base, (req, res, next) => {(new CustomerReserveController(req, res, next)).complete()});




    app.get('/Error/NotFound', 'Error.NotFound', base, (req, res, next) => {(new ErrorController(req, res, next)).notFound()});

    // 404
    app.use((req, res, next) => {
        return res.redirect('/Error/NotFound');
    });

    // error handlers
    app.use((err: any, req, res, next) => {
        (new ErrorController(req, res, next)).index(err);
    });
}
