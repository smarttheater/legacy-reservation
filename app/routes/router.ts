/**
 * ルーティング
 *
 * @ignore
 */

import * as express from 'express';
import * as languageController from '../controllers/language';
// import * as otherController from '../controllers/other';
import * as reserveController from '../controllers/reserve';

const router = express.Router();

// 言語
router.get('/language/update/:locale', languageController.update);

router.get('/reserve/getSeatProperties', reserveController.getSeatProperties);
router.get('/reserve/:performanceId/unavailableSeatCodes', reserveController.getUnavailableSeatCodes);

export default router;
