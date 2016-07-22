import NamedRoutes = require('named-routes');
import express = require('express');

import PerformanceController from '../controllers/Performance/PerformanceController';
import ReservationController from '../controllers/Reservation/ReservationController';


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
    let router = new NamedRoutes();
    router.extendExpress(app);
    router.registerAppHelpers(app);



    // search performances
    app.get('/api/:locale/performance/search', 'performance.search', (req, res, next) => {(new PerformanceController(req, res, next)).search()});

    // reservation email
    app.post('/api/:locale/reservation/email', 'reservation.email', (req, res, next) => {(new ReservationController(req, res, next)).email()});





    // 404
    app.use((req, res, next) => {
        res.json({
            isSuccess: false,
            message: 'Not Found'
        });
    });

    // error handlers
    app.use((err: any, req, res, next) => {
        res.json({
            isSuccess: false,
            message: 'Internal Server Error'
        });
    });
}
