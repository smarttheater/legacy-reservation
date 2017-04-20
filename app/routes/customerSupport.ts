/**
 * 一般座席予約キャンセルルーター
 *
 * @function customerSupportRouter
 * @ignore
 */
import { Application, NextFunction, Request, Response } from 'express';
import CustomerCancelController from '../controllers/Customer/Cancel/CustomerCancelController';

export default (app: Application) => {
    // tslint:disable-next-line:variable-name
    const base = (_req: Request, _res: Response, next: NextFunction) => {
        next();
    };

    // tslint:disable:max-line-length
    app.all('/customerSupport/cancel', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerCancelController(req, res, next)).index(); });
    app.post('/customerSupport/cancel/executeByPaymentNo', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerCancelController(req, res, next)).executeByPaymentNo(); });
};
