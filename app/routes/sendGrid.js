"use strict";
/**
 * SendGridルーティング
 *
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const sendGridController = require("../controllers/sendGrid");
const router = express.Router();
router.post('/event/notify', sendGridController.notifyEvent);
exports.default = router;
