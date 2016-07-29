"use strict";
var log4js = require('log4js');
/**
 * ベースコントローラー
 */
var BaseController = (function () {
    function BaseController() {
        this.logger = log4js.getLogger('system');
    }
    return BaseController;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BaseController;
