/**
 * ルーティング
 *
 * @ignore
 */

import * as express from 'express';
import * as gmoController from '../controllers/gmo';

const router = express.Router();

router.post('/notify', gmoController.notify);

export default router;
