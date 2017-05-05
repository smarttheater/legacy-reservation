/**
 * SendGridウェブフックコントローラー
 *
 * @namespace controller/sendGrid
 */

import { Models } from '@motionpicture/chevre-domain';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';

const debug = createDebug('chevre-frontend:controller:sendGrid');

/**
 * SendGridイベントフック
 */
export async function notifyEvent(req: Request, res: Response, next: NextFunction) {
    debug('SendGrid event notification is', req.body);

    if (req.method === 'GET') {
        res.send('0');
        return;
    }

    try {
        debug('creating sendgrid_event_notifications...');
        const notifications = await Models.SendGridEventNotification.create(req.body);
        debug('sendgrid_event_notifications created.', notifications);

        res.send('0');
    } catch (error) {
        console.error(error);
        next(error);
    }
}
