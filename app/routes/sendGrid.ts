/**
 * SendGridルーティング
 *
 * @ignore
 */

import * as express from 'express';
import * as sendGridController from '../controllers/sendGrid';

const router = express.Router();

router.post('/event/notify', sendGridController.notifyEvent);

export default router;
