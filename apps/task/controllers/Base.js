"use strict";
var log4js = require('log4js');
var Base = (function () {
    function Base() {
        this.logger = log4js.getLogger('system');
    }
    return Base;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Base;
