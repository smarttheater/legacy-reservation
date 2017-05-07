/**
 * 一般座席予約キャンセルルーティング
 *
 * @ignore
 */

import * as express from 'express';
import * as customerCancelController from '../controllers/customerCancel';

const router = express.Router();

router.all('/cancel', customerCancelController.index);
router.post('/cancel/executeByPaymentNo', customerCancelController.executeByPaymentNo);

export default router;
