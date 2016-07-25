"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var AdmissionController = (function (_super) {
    __extends(AdmissionController, _super);
    function AdmissionController() {
        _super.apply(this, arguments);
    }
    AdmissionController.prototype.create = function () {
        var reservationId = this.req.body.reservationId;
        this.res.json({
            isSuccess: true
        });
    };
    return AdmissionController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdmissionController;
