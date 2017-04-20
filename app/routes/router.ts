/**
 * デフォルトルーター
 *
 * @function router
 * @ignore
 */
import { Application, NextFunction, Request, Response } from 'express';
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
export default (app: Application) => {
    // tslint:disable-next-line:variable-name
    const base = (_req: Request, _res: Response, next: NextFunction) => {
        next();
    };

    // tslint:disable:max-line-length

    // 言語
    app.get('/language/update/:locale', base, (req: Request, res: Response, next: NextFunction) => { (new LanguageController(req, res, next)).update(); });

    app.get('/reserve/:token/getSeatProperties', base, async (req: Request, res: Response, next: NextFunction) => { await (new ReserveController(req, res, next)).getSeatProperties(); });
    app.get('/reserve/:performanceId/unavailableSeatCodes', base, async (req: Request, res: Response, next: NextFunction) => { await (new ReserveController(req, res, next)).getUnavailableSeatCodes(); });
    app.get('/reserve/print', base, async (req: Request, res: Response, next: NextFunction) => { await (new ReserveController(req, res, next)).print(); });

    // GMOプロセス
    app.post('/GMO/reserve/:token/start', base, async (req: Request, res: Response, next: NextFunction) => { await (new GMOReserveController(req, res, next)).start(); });
    app.post('/GMO/reserve/result', base, async (req: Request, res: Response, next: NextFunction) => { await (new GMOReserveController(req, res, next)).result(); });
    app.get('/GMO/reserve/:paymentNo/cancel', base, async (req: Request, res: Response, next: NextFunction) => { await (new GMOReserveController(req, res, next)).cancel(); });
    app.all('/GMO/notify', base, async (req: Request, res: Response, next: NextFunction) => { await (new GMOController(req, res, next)).notify(); });

    // admission
    app.all('/admission/performances', base, async (req: Request, res: Response, next: NextFunction) => { await (new AdmissionController(req, res, next)).performances(); });
    app.get('/admission/performance/:id/confirm', base, async (req: Request, res: Response, next: NextFunction) => { await (new AdmissionController(req, res, next)).confirm(); });

    app.get('/policy', base, (req: Request, res: Response, next: NextFunction) => { (new OtherController(req, res, next)).policy(); });
    app.get('/privacy', base, (req: Request, res: Response, next: NextFunction) => { (new OtherController(req, res, next)).privacy(); });
    app.get('/commercialTransactions', base, (req: Request, res: Response, next: NextFunction) => { (new OtherController(req, res, next)).commercialTransactions(); });

    // 一般
    // 本番環境ではhomeは存在しない
    if (process.env.NODE_ENV !== 'production') {
        app.all('/customer/reserve/performances', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).performances(); });
    }
    app.get('/customer/reserve/start', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).start(); });
    app.all('/customer/reserve/:token/terms', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).terms(); });
    app.all('/customer/reserve/:token/seats', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).seats(); });
    app.all('/customer/reserve/:token/tickets', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).tickets(); });
    app.all('/customer/reserve/:token/profile', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).profile(); });
    app.all('/customer/reserve/:token/confirm', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).confirm(); });
    app.all('/customer/reserve/:token/payment', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).payment(); });
    app.get('/customer/reserve/:paymentNo/waitingSettlement', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).waitingSettlement(); });
    app.get('/customer/reserve/:paymentNo/complete', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerReserveController(req, res, next)).complete(); });

    app.get('/error/notFound', base, (req: Request, res: Response, next: NextFunction) => { (new ErrorController(req, res, next)).notFound(); });

    // 404
    // tslint:disable-next-line:variable-name
    app.use((_req: Request, res: Response) => {
        res.redirect('/error/notFound');
    });

    // error handlers
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        req.route.path = '/error/error';
        (new ErrorController(req, res, next)).index(err);
    });
};
