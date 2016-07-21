"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../../BaseController');
var Models_1 = require('../../../../common/models/Models');
var ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
var StaffCancelController = (function (_super) {
    __extends(StaffCancelController, _super);
    function StaffCancelController() {
        _super.apply(this, arguments);
    }
    StaffCancelController.prototype.execute = function () {
        var _this = this;
        // 予約IDリストをjson形式で受け取る
        var reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            var promises = [];
            var updatedReservationIds_1 = [];
            var _loop_1 = function(reservationId) {
                promises.push(new Promise(function (resolve, reject) {
                    // TIFF確保にステータス更新
                    _this.logger.debug('canceling reservation...id:', reservationId);
                    Models_1.default.Reservation.update({
                        _id: reservationId,
                        staff: _this.staffUser.get('_id'),
                    }, {
                        status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
                    }, function (err, affectedRows) {
                        if (err || affectedRows === 0) {
                        }
                        else {
                            updatedReservationIds_1.push(reservationId);
                        }
                        resolve();
                    });
                }));
            };
            for (var _i = 0, reservationIds_1 = reservationIds; _i < reservationIds_1.length; _i++) {
                var reservationId = reservationIds_1[_i];
                _loop_1(reservationId);
            }
            Promise.all(promises).then(function () {
                // 変更できていない予約があった場合
                if (reservationIds.length > updatedReservationIds_1.length) {
                    _this.res.json({
                        isSuccess: false,
                        reservationIds: updatedReservationIds_1
                    });
                }
                else {
                    _this.res.json({
                        isSuccess: true,
                        reservationIds: updatedReservationIds_1
                    });
                }
            }, function (err) {
                _this.res.json({
                    isSuccess: false,
                    reservationId: []
                });
            });
        }
        else {
            this.res.json({
                isSuccess: false,
                reservationId: []
            });
        }
    };
    return StaffCancelController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffCancelController;
