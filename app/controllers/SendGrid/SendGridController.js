"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const BaseController_1 = require("../BaseController");
class SendGridController extends BaseController_1.default {
    /**
     * SendGridイベントフック
     */
    notifyEvent() {
        this.logger.info('SendGrid event notification is', this.req.body);
        if (this.req.method === 'GET') {
            this.res.send('0');
            return;
        }
        this.logger.info('creating sendgrid_event_notifications...');
        ttts_domain_1.Models.SendGridEventNotification.create(this.req.body, (err, notifications) => {
            this.logger.info('sendgrid_event_notifications created.', err, notifications);
            if (err)
                return this.next(err);
            this.res.send('0');
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SendGridController;
