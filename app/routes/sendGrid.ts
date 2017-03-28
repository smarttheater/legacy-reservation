/**
 * SendGridルーター
 *
 * @function sendGridRouter
 * @ignore
 */
import { NextFunction, Request, Response } from 'express';
import SendGridController from '../controllers/SendGrid/SendGridController';

export default (app: any) => {
    // tslint:disable:max-line-length
    // イベントフック
    app.all('/sendGrid/event/notify', 'sendGrid.event.notify', async (req: Request, res: Response, next: NextFunction) => { await (new SendGridController(req, res, next)).notifyEvent(); });
};
