import BaseController from '../BaseController';
import {Models} from "@motionpicture/ttts-domain";

export default class SendGridController extends BaseController {
    /**
     * SendGridイベントフック
     */
    public notifyEvent(): void {
        this.logger.info('SendGrid event notification is', this.req.body);

        if (this.req.method === 'GET') {
            this.res.send('0');
            return;
        }

        this.logger.info('creating sendgrid_event_notifications...');
        Models.SendGridEventNotification.create(this.req.body, (err, notifications) => {
            this.logger.info('sendgrid_event_notifications created.', err, notifications);
            if (err) return this.next(err);

            this.res.send('0');
        });
    }
}
