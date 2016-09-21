"use strict";
const BaseController_1 = require('../BaseController');
class IndexController extends BaseController_1.default {
    index() {
        this.res.render('index/index', {});
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IndexController;
