"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * customerルーティング
 */
const express_1 = require("express");
const customerReserveController = require("../controllers/customer/reserve");
const customerRouter = express_1.Router();
customerRouter.get('/reserve/start', customerReserveController.start);
customerRouter.all('/reserve/changeCategory/:category', customerReserveController.changeCategory);
customerRouter.all('/reserve/performances', customerReserveController.performances);
customerRouter.all('/reserve/tickets', customerReserveController.tickets);
customerRouter.all('/reserve/profile', customerReserveController.profile);
customerRouter.all('/reserve/confirm', customerReserveController.confirm);
customerRouter.get('/reserve/complete', customerReserveController.complete);
exports.default = customerRouter;
