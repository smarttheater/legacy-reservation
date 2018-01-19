/**
 * customerルーティング
 * @namespace routes.customer
 */

import { Router } from 'express';
import * as customerReserveController from '../controllers/customer/reserve';

const customerRouter = Router();

customerRouter.get('/reserve/start', customerReserveController.start);

// 東京タワーではなし
// customerRouter.all('/reserve/terms', customerReserveController.terms);
// customerRouter.all('/reserve/seats', customerReserveController.seats);
customerRouter.all('/reserve/performances', customerReserveController.performances);
customerRouter.all('/reserve/tickets', customerReserveController.tickets);
customerRouter.all('/reserve/profile', customerReserveController.profile);
customerRouter.all('/reserve/confirm', customerReserveController.confirm);
customerRouter.get('/reserve/complete', customerReserveController.complete);

export default customerRouter;
