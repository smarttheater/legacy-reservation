"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../../BaseController');
var Models_1 = require('../../../../common/models/Models');
var ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
var SponsorCancelController = (function (_super) {
    __extends(SponsorCancelController, _super);
    function SponsorCancelController() {
        _super.apply(this, arguments);
    }
    SponsorCancelController.prototype.execute = function () {
        var _this = this;
        var reservationId = this.req.body.reservation_id;
        // TIFF確保にステータス更新
        this.logger.debug('canceling reservation...id:', reservationId);
        Models_1.default.Reservation.update({
            _id: reservationId,
            sponsor: this.sponsorUser.get('_id'),
        }, {
            status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
        }, function (err, affectedRows) {
            if (err || affectedRows === 0) {
                _this.res.json({
                    isSuccess: false,
                    reservationId: reservationId
                });
            }
            else {
                _this.res.json({
                    isSuccess: true,
                    reservationId: reservationId
                });
            }
        });
    };
    return SponsorCancelController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorCancelController;
