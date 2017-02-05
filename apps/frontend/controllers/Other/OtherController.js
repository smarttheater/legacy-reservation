"use strict";
const BaseController_1 = require("../BaseController");
class OtherController extends BaseController_1.default {
    policy() {
        this.res.render(`other/policy_${this.req.getLocale()}`);
    }
    privacy() {
        this.res.render(`other/privacy_${this.req.getLocale()}`);
    }
    commercialTransactions() {
        this.res.render(`other/commercialTransactions_${this.req.getLocale()}`);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OtherController;
