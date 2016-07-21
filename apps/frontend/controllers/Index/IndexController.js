"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var IndexController = (function (_super) {
    __extends(IndexController, _super);
    function IndexController() {
        _super.apply(this, arguments);
    }
    IndexController.prototype.index = function () {
        this.res.render('index/index', {});
    };
    return IndexController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IndexController;
