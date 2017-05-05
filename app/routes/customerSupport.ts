/**
 * 一般座席予約キャンセルルーター
 *
 * @function customerSupportRouter
 * @ignore
 */

import { Application } from 'express';
import * as customerCancelController from '../controllers/customerCancel';

export default (app: Application) => {
    app.all('/customerSupport/cancel', customerCancelController.index);
    app.post('/customerSupport/cancel/executeByPaymentNo', customerCancelController.executeByPaymentNo);
};
