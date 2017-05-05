"use strict";
/**
 * SendGridウェブフックコントローラー
 *
 * @namespace controller/sendGrid
 */
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
const createDebug = require("debug");
const debug = createDebug('chevre-frontend:controller:sendGrid');
/**
 * SendGridイベントフック
 */
function notifyEvent(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('SendGrid event notification is', req.body);
        if (req.method === 'GET') {
            res.send('0');
            return;
        }
        try {
            debug('creating sendgrid_event_notifications...');
            const notifications = yield chevre_domain_1.Models.SendGridEventNotification.create(req.body);
            debug('sendgrid_event_notifications created.', notifications);
            res.send('0');
        }
        catch (error) {
            console.error(error);
            next(error);
        }
    });
}
exports.notifyEvent = notifyEvent;
