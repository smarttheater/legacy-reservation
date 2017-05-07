/**
 * ルーティング
 *
 * @ignore
 */

import * as express from 'express';
import * as gmoController from '../controllers/gmo';
import * as gmoReserveController from '../controllers/gmo/reserve';
import * as languageController from '../controllers/language';
import * as otherController from '../controllers/other';
import * as reserveController from '../controllers/reserve';

const router = express.Router();

// 言語
router.get('/language/update/:locale', languageController.update);

router.get('/reserve/getSeatProperties', reserveController.getSeatProperties);
router.get('/reserve/:performanceId/unavailableSeatCodes', reserveController.getUnavailableSeatCodes);
router.get('/reserve/print', reserveController.print);

// GMOプロセス
router.post('/GMO/reserve/start', gmoReserveController.start);
router.post('/GMO/reserve/result', gmoReserveController.result);
router.get('/GMO/reserve/:orderId/cancel', gmoReserveController.cancel);
router.post('/GMO/notify', gmoController.notify);

router.get('/policy', otherController.policy);
router.get('/privacy', otherController.privacy);
router.get('/commercialTransactions', otherController.commercialTransactions);

export default router;
