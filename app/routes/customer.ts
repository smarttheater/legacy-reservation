/**
 * customerルーティング
 *
 * @ignore
 */

import * as express from 'express';
import * as customerGmoReserveController from '../controllers/customer/gmo/reserve';
import * as customerReserveController from '../controllers/customer/reserve';

const router = express.Router();

// 一般
// 本番環境ではhomeは存在しない
if (process.env.NODE_ENV !== 'production') {
    router.all('/reserve/performances', customerReserveController.performances);
}
router.get('/reserve/start', customerReserveController.start);
router.all('/reserve/terms', customerReserveController.terms);
router.all('/reserve/seats', customerReserveController.seats);
router.all('/reserve/tickets', customerReserveController.tickets);
router.all('/reserve/profile', customerReserveController.profile);
router.all('/reserve/confirm', customerReserveController.confirm);
router.get('/reserve/:performanceDay/:paymentNo/waitingSettlement', customerReserveController.waitingSettlement);
router.get('/reserve/:performanceDay/:paymentNo/complete', customerReserveController.complete);

router.post('/reserve/gmo/start', customerGmoReserveController.start);
router.post('/reserve/gmo/result', customerGmoReserveController.result);
router.get('/reserve/gmo/:orderId/cancel', customerGmoReserveController.cancel);

export default router;
