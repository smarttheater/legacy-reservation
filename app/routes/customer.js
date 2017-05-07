"use strict";
/**
 * customerルーティング
 *
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const customerReserveController = require("../controllers/customer/reserve");
const gmoReserveController = require("../controllers/gmo/reserve");
const router = express.Router();
// 一般
// 本番環境ではhomeは存在しない
if (process.env.NODE_ENV !== 'production') {
    router.all('/reserve/performances', customerReserveController.performances);
}
router.get('/reserve/start', customerReserveController.start);
router.all('/reserve/terms', customerReserveController.terms);
router.all('/reserve/seats', customerReserveController.seats);
router.all('/reserve/tickets', customerReserveController.tickets);
router.all('/reserve/profile', customerReserveController.profile);
router.all('/reserve/confirm', customerReserveController.confirm);
router.get('/reserve/:performanceDay/:paymentNo/waitingSettlement', customerReserveController.waitingSettlement);
router.get('/reserve/:performanceDay/:paymentNo/complete', customerReserveController.complete);
router.post('/reserve/gmo/start', gmoReserveController.start);
router.post('/reserve/gmo/result', gmoReserveController.result);
router.get('/reserve/gmo/:orderId/cancel', gmoReserveController.cancel);
exports.default = router;
