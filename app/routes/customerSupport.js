"use strict";
/**
 * 一般座席予約キャンセルルーティング
 *
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const customerCancelController = require("../controllers/customerCancel");
const router = express.Router();
router.all('/cancel', customerCancelController.index);
router.post('/cancel/executeByPaymentNo', customerCancelController.executeByPaymentNo);
exports.default = router;
