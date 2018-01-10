"use strict";
/**
 * customerルーティング
 * @namespace routes.customer
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customerReserveController = require("../controllers/customer/reserve");
const customerRouter = express_1.Router();
customerRouter.all('/reserve/performances/:category', customerReserveController.performances);
customerRouter.get('/reserve/start', customerReserveController.start);
// 東京タワーではなし
// customerRouter.all('/reserve/terms', customerReserveController.terms);
// customerRouter.all('/reserve/seats', customerReserveController.seats);
customerRouter.all('/reserve/tickets', customerReserveController.tickets);
customerRouter.all('/reserve/profile', customerReserveController.profile);
customerRouter.all('/reserve/confirm', customerReserveController.confirm);
customerRouter.get('/reserve/complete', customerReserveController.complete);
exports.default = customerRouter;
