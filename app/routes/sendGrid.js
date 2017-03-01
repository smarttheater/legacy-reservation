"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SendGridController_1 = require("../controllers/SendGrid/SendGridController");
exports.default = (app) => {
    // イベントフック
    app.all('/sendGrid/event/notify', 'sendGrid.event.notify', (req, res, next) => { (new SendGridController_1.default(req, res, next)).notifyEvent(); });
};
