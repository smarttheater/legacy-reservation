/**
 * SendGridルーター
 *
 * @function sendGridRouter
 * @ignore
 */

import { Application } from 'express';
import * as sendGridController from '../controllers/sendGrid';

export default (app: Application) => {
    app.all('/sendGrid/event/notify', sendGridController.notifyEvent);
};
