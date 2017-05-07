"use strict";
/**
 * ルーティング
 *
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const gmoController = require("../controllers/gmo");
const router = express.Router();
router.post('/notify', gmoController.notify);
exports.default = router;
