"use strict";
const BaseController_1 = require("../BaseController");
class OtherController extends BaseController_1.default {
    policy() {
        this.res.render('other/policy');
    }
    privacy() {
        this.res.render('other/privacy');
    }
    commercialTransactions() {
        this.res.render('other/commercialTransactions');
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OtherController;
