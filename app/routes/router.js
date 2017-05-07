"use strict";
/**
 * ルーティング
 *
 * @ignore
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const gmoController = require("../controllers/gmo");
const gmoReserveController = require("../controllers/gmo/reserve");
const languageController = require("../controllers/language");
const otherController = require("../controllers/other");
const reserveController = require("../controllers/reserve");
const router = express.Router();
// 言語
router.get('/language/update/:locale', languageController.update);
router.get('/reserve/getSeatProperties', reserveController.getSeatProperties);
router.get('/reserve/:performanceId/unavailableSeatCodes', reserveController.getUnavailableSeatCodes);
router.get('/reserve/print', reserveController.print);
// GMOプロセス
router.post('/GMO/reserve/start', gmoReserveController.start);
router.post('/GMO/reserve/result', gmoReserveController.result);
router.get('/GMO/reserve/:orderId/cancel', gmoReserveController.cancel);
router.post('/GMO/notify', gmoController.notify);
router.get('/policy', otherController.policy);
router.get('/privacy', otherController.privacy);
router.get('/commercialTransactions', otherController.commercialTransactions);
exports.default = router;
