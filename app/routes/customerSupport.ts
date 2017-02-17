import * as express from 'express';
import CustomerCancelController from '../controllers/Customer/Cancel/CustomerCancelController';

export default (app: any) => {
    // tslint:disable-next-line:variable-name
    const base = (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
        next();
    };

    app.all('/customerSupport/cancel', 'customer.cancel', base, (req: express.Request, res: express.Response, next: express.NextFunction) => {(new CustomerCancelController(req, res, next)).index(); });
    app.post('/customerSupport/cancel/executeByPaymentNo', 'customer.cancel.executeByPaymentNo', base, (req: express.Request, res: express.Response, next: express.NextFunction) => {(new CustomerCancelController(req, res, next)).executeByPaymentNo(); });
};
