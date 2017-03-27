"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.info('SendGrid event notification is', this.req.body);
            if (this.req.method === 'GET') {
                this.res.send('0');
                return;
            }
            try {
                this.logger.info('creating sendgrid_event_notifications...');
                const notifications = yield chevre_domain_1.Models.SendGridEventNotification.create(this.req.body);
                this.logger.info('sendgrid_event_notifications created.', notifications);
                this.res.send('0');
            }
            catch (error) {
                console.error(error);
                this.next(error);
            }
        });
    }
}
exports.default = SendGridController;
