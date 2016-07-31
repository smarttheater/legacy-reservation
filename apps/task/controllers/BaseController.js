"use strict";
const log4js = require('log4js');
/**
 * ベースコントローラー
 */
class BaseController {
    constructor() {
        this.logger = log4js.getLogger('system');
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
