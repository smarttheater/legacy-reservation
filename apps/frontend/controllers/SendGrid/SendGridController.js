"use strict";
const BaseController_1 = require('../BaseController');
class SendGridController extends BaseController_1.default {
    /**
     * SendGridイベントフック
     */
    notifyEvent() {
        this.logger.info('SendGrid event notification is', this.req.body);
        this.res.json({
            success: true,
            message: 'success'
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SendGridController;
