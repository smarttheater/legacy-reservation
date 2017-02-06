import express = require('express');
import CustomerCancelController from '../controllers/Customer/Cancel/CustomerCancelController';

export default (app: any) => {
    let base = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        next();
    }

    app.all('/customerSupport/cancel', 'customer.cancel', base, (req, res, next) => {(new CustomerCancelController(req, res, next)).index()});
    app.post('/customerSupport/cancel/executeByPaymentNo', 'customer.cancel.executeByPaymentNo', base, (req, res, next) => {(new CustomerCancelController(req, res, next)).executeByPaymentNo()});
}
