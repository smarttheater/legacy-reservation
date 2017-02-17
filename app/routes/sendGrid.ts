/**
 * SendGridルーター
 *
 * @function sendGridRouter
 * @ignore
 */
import { NextFunction, Request, Response } from 'express';
import SendGridController from '../controllers/SendGrid/SendGridController';

export default (app: any) => {
    // イベントフック
    app.all('/sendGrid/event/notify', 'sendGrid.event.notify', (req: Request, res: Response, next: NextFunction) => {(new SendGridController(req, res, next)).notifyEvent(); });
};
