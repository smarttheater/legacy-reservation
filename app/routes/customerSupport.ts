/**
 * 一般座席予約キャンセルルーター
 *
 * @function customerSupportRouter
 * @ignore
 */
import { NextFunction, Request, Response } from 'express';
import CustomerCancelController from '../controllers/Customer/Cancel/CustomerCancelController';

export default (app: any) => {
    // tslint:disable-next-line:variable-name
    const base = (_req: Request, _res: Response, next: NextFunction) => {
        next();
    };

    app.all('/customerSupport/cancel', 'customer.cancel', base, (req: Request, res: Response, next: NextFunction) => { (new CustomerCancelController(req, res, next)).index(); });
    app.post('/customerSupport/cancel/executeByPaymentNo', 'customer.cancel.executeByPaymentNo', base, async (req: Request, res: Response, next: NextFunction) => { await (new CustomerCancelController(req, res, next)).executeByPaymentNo(); });
};
