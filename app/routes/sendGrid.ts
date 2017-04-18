/**
 * SendGridルーター
 *
 * @function sendGridRouter
 * @ignore
 */
import { Application, NextFunction, Request, Response } from 'express';
import SendGridController from '../controllers/SendGrid/SendGridController';

export default (app: Application) => {
    // tslint:disable:max-line-length
    // イベントフック
    app.all('/sendGrid/event/notify', async (req: Request, res: Response, next: NextFunction) => { await (new SendGridController(req, res, next)).notifyEvent(); });
};
