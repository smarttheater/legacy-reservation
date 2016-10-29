"use strict";
const SendGridController_1 = require('../controllers/SendGrid/SendGridController');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (app) => {
    // イベントフック
    app.all('/sendGrid/event/notify', 'sendGrid.event.notify', (req, res, next) => { (new SendGridController_1.default(req, res, next)).notifyEvent(); });
};
