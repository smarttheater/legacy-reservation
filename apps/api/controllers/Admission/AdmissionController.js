"use strict";
const BaseController_1 = require('../BaseController');
class AdmissionController extends BaseController_1.default {
    create() {
        let reservationId = this.req.body.reservationId;
        this.res.json({
            isSuccess: true
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdmissionController;
