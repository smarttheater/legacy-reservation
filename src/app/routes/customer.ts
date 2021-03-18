/**
 * 注文取引ルーティング
 */
import { Router } from 'express';

import * as OrderController from '../controllers/order';

const customerRouter = Router();

customerRouter.get('/reserve/start', OrderController.start);
customerRouter.all('/reserve/changeCategory/:category', OrderController.changeCategory);
customerRouter.all('/reserve/performances', OrderController.performances);
customerRouter.all('/reserve/tickets', OrderController.tickets);
customerRouter.all('/reserve/profile', OrderController.setProfile);
customerRouter.all('/reserve/confirm', OrderController.confirm);
customerRouter.get('/reserve/complete', OrderController.complete);
customerRouter.get('/reserve/print', OrderController.print);

export default customerRouter;
