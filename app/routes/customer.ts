/**
 * customerルーティング
 *
 * @ignore
 */
import { Router } from 'express';
import * as customerReserveController from '../controllers/customer/reserve';

const customerRouter = Router();

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
customerRouter.get('/reserve/complete', customerReserveController.complete);

export default customerRouter;
