/**
 * customerルーティング
 *
 * @ignore
 */

import * as express from 'express';
import * as customerCancelController from '../controllers/customer/cancel';
import * as customerReserveController from '../controllers/customer/reserve';
import * as customerReserveGmoController from '../controllers/customer/reserve/gmo';

const customerRouter = express.Router();

// 本番環境ではhomeは存在しない
if (process.env.NODE_ENV !== 'production') {
    customerRouter.all('/reserve/performances/:category', customerReserveController.performances);
    //customerRouter.post('/reserve/performances/:category', customerReserveController.performances);
}
customerRouter.get('/reserve/start', customerReserveController.start);
//2017/05/11 座席選択削除
//customerRouter.all('/reserve/terms', customerReserveController.terms);
//customerRouter.all('/reserve/seats', customerReserveController.seats);
//---
customerRouter.all('/reserve/tickets', customerReserveController.tickets);
customerRouter.all('/reserve/profile', customerReserveController.profile);
customerRouter.all('/reserve/confirm', customerReserveController.confirm);
customerRouter.get('/reserve/:performanceDay/:paymentNo/waitingSettlement', customerReserveController.waitingSettlement);
customerRouter.get('/reserve/:performanceDay/:paymentNo/complete', customerReserveController.complete);

customerRouter.post('/reserve/gmo/start', customerReserveGmoController.start);
customerRouter.post('/reserve/gmo/result', customerReserveGmoController.result);
customerRouter.get('/reserve/gmo/:orderId/cancel', customerReserveGmoController.cancel);

customerRouter.all('/cancel', customerCancelController.index);
customerRouter.post('/cancel/executeByPaymentNo', customerCancelController.executeByPaymentNo);

export default customerRouter;
