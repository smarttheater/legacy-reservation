import * as express from 'express';
import SendGridController from '../controllers/SendGrid/SendGridController';

export default (app: any) => {
    // イベントフック
    app.all('/sendGrid/event/notify', 'sendGrid.event.notify', (req: express.Request, res: express.Response, next: express.NextFunction) => {(new SendGridController(req, res, next)).notifyEvent(); });
};
