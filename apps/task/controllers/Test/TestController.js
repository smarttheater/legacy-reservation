"use strict";
const BaseController_1 = require("../BaseController");
const mongoose = require("mongoose");
const conf = require("config");
const ReservationUtil_1 = require("../../../common/models/Reservation/ReservationUtil");
let MONGOLAB_URI = conf.get('mongolab_uri');
class TestController extends BaseController_1.default {
    publishPaymentNo() {
        mongoose.connect(MONGOLAB_URI, {});
        ReservationUtil_1.default.publishPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
