"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../../BaseController');
var SponsorMyPageController = (function (_super) {
    __extends(SponsorMyPageController, _super);
    function SponsorMyPageController() {
        _super.apply(this, arguments);
    }
    SponsorMyPageController.prototype.index = function () {
        this.res.render('sponsor/mypage/index', {
            layout: 'layouts/sponsor/layout'
        });
    };
    return SponsorMyPageController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorMyPageController;
