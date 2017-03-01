"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const BaseController_1 = require("../BaseController");
/**
 * SendGridウェブフックコントローラー
 *
 * @export
 * @class SendGridController
 * @extends {BaseController}
 */
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
        chevre_domain_1.Models.SendGridEventNotification.create(this.req.body, (err, notifications) => {
            this.logger.info('sendgrid_event_notifications created.', err, notifications);
            if (err)
                return this.next(err);
            this.res.send('0');
        });
    }
}
exports.default = SendGridController;
