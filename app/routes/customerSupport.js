"use strict";
/**
 * 一般座席予約キャンセルルーター
 *
 * @function customerSupportRouter
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const customerCancelController = require("../controllers/customerCancel");
exports.default = (app) => {
    app.all('/customerSupport/cancel', customerCancelController.index);
    app.post('/customerSupport/cancel/executeByPaymentNo', customerCancelController.executeByPaymentNo);
};
