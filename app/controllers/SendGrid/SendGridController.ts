import { Models } from '@motionpicture/chevre-domain';
import * as createDebug from 'debug';

import BaseController from '../BaseController';

const debug = createDebug('chevre-frontend:controller:sendGrid');

/**
 * SendGridウェブフックコントローラー
 *
 * @export
 * @class SendGridController
 * @extends {BaseController}
 */
export default class SendGridController extends BaseController {
    /**
     * SendGridイベントフック
     */
    public async notifyEvent() {
        debug('SendGrid event notification is', this.req.body);

        if (this.req.method === 'GET') {
            this.res.send('0');
            return;
        }

        try {
            debug('creating sendgrid_event_notifications...');
            const notifications = await Models.SendGridEventNotification.create(this.req.body);
            debug('sendgrid_event_notifications created.', notifications);

            this.res.send('0');
        } catch (error) {
            console.error(error);
            this.next(error);
        }
    }
}
