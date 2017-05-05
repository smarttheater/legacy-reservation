/**
 * デフォルトルーター
 *
 * @function router
 * @ignore
 */

import { Application, NextFunction, Request, Response } from 'express';
import CustomerReserveController from '../controllers/customer/reserve';
import * as errorController from '../controllers/error';
import * as gmoController from '../controllers/gmo';
import * as gmoReserveController from '../controllers/gmo/reserve';
import * as languageController from '../controllers/language';
import * as otherController from '../controllers/other';
import * as reserveController from '../controllers/reserve';

/**
 * URLルーティング
 *
 * app.get(パス, ルーティング名称, メソッド);
 * といった形でルーティングを登録する
 * ルーティング名称は、ejs側やコントローラーでURLを生成する際に用いたりするので、意識的にページ一意な値を定めること
 *
 * リクエスト毎に、req,res,nextでコントローラーインスタンスを生成して、URLに応じたメソッドを実行する、という考え方
 */
export default (app: Application) => {
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
        app.all('/customer/reserve/performances', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).performances(); });
    }
    app.get('/customer/reserve/start', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).start(); });
    app.all('/customer/reserve/:token/terms', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).terms(); });
    app.all('/customer/reserve/:token/seats', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).seats(); });
    app.all('/customer/reserve/:token/tickets', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).tickets(); });
    app.all('/customer/reserve/:token/profile', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).profile(); });
    app.all('/customer/reserve/:token/confirm', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).confirm(); });
    app.get('/customer/reserve/:performanceDay/:paymentNo/waitingSettlement', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).waitingSettlement(); });
    app.get('/customer/reserve/:performanceDay/:paymentNo/complete', async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).complete(); });

    app.get('/error/notFound', errorController.notFound);

    // 404
    app.use((__: Request, res: Response) => {
        res.redirect('/error/notFound');
    });

    // error handlers
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        req.route.path = '/error/error';
        errorController.index(err, req, res, next);
    });
};
