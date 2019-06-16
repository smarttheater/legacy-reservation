/**
 * customerルーティング
 */
import { Router } from 'express';
import * as customerReserveController from '../controllers/customer/reserve';

const customerRouter = Router();

customerRouter.get('/reserve/start', customerReserveController.start);

customerRouter.all('/reserve/changeCategory/:category', customerReserveController.changeCategory);
customerRouter.all('/reserve/performances', customerReserveController.performances);
customerRouter.all('/reserve/tickets', customerReserveController.tickets);
customerRouter.all('/reserve/profile', customerReserveController.profile);
customerRouter.all('/reserve/confirm', customerReserveController.confirm);
customerRouter.get('/reserve/complete', customerReserveController.complete);

export default customerRouter;
