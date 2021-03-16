"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 注文取引ルーティング
 */
const express_1 = require("express");
const OrderController = require("../controllers/order");
const customerRouter = express_1.Router();
customerRouter.get('/reserve/start', OrderController.start);
customerRouter.all('/reserve/changeCategory/:category', OrderController.changeCategory);
customerRouter.all('/reserve/performances', OrderController.performances);
customerRouter.all('/reserve/tickets', OrderController.tickets);
customerRouter.all('/reserve/profile', OrderController.setProfile);
customerRouter.all('/reserve/confirm', OrderController.confirm);
customerRouter.get('/reserve/complete', OrderController.complete);
customerRouter.get('/reserve/print', OrderController.print);
exports.default = customerRouter;
