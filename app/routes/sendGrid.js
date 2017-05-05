"use strict";
/**
 * SendGridルーター
 *
 * @function sendGridRouter
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const sendGridController = require("../controllers/sendGrid");
exports.default = (app) => {
    app.all('/sendGrid/event/notify', sendGridController.notifyEvent);
};
