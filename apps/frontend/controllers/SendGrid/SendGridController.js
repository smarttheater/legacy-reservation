"use strict";
const BaseController_1 = require("../BaseController");
const Models_1 = require("../../../common/models/Models");
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
        Models_1.default.SendGridEventNotification.create(this.req.body, (err, notifications) => {
            this.logger.info('sendgrid_event_notifications created.', err, notifications);
            if (err)
                return this.next(err);
            this.res.send('0');
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SendGridController;
