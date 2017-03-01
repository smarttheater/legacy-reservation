"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BaseController_1 = require("../BaseController");
/**
 * 静的ページコントローラー
 *
 * @export
 * @class OtherController
 * @extends {BaseController}
 */
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
exports.default = OtherController;
