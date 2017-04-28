import { Models } from '@motionpicture/chevre-domain';
import BaseController from '../BaseController';

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
        console.log('SendGrid event notification is', this.req.body);

        if (this.req.method === 'GET') {
            this.res.send('0');
            return;
        }

        try {
            console.log('creating sendgrid_event_notifications...');
            const notifications = await Models.SendGridEventNotification.create(this.req.body);
            console.log('sendgrid_event_notifications created.', notifications);

            this.res.send('0');
        } catch (error) {
            console.error(error);
            this.next(error);
        }
    }
}
