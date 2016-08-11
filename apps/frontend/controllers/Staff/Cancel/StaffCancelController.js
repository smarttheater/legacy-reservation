"use strict";
const BaseController_1 = require('../../BaseController');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
class StaffCancelController extends BaseController_1.default {
    execute() {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            let promises = [];
            let updatedReservationIds = [];
            for (let reservationId of reservationIds) {
                promises.push(new Promise((resolve, reject) => {
                    // TIFF確保にステータス更新
                    this.logger.debug('canceling reservation...id:', reservationId);
                    Models_1.default.Reservation.update({
                        _id: reservationId,
                        staff: this.staffUser.get('_id'),
                        purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_STAFF,
                        status: ReservationUtil_1.default.STATUS_RESERVED
                    }, {
                        // TODO 内部保留の所有者はadmin
                        status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
                    }, (err, raw) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            updatedReservationIds.push(reservationId);
                            resolve();
                        }
                    });
                }));
            }
            Promise.all(promises).then(() => {
                this.res.json({
                    isSuccess: true,
                    reservationIds: updatedReservationIds
                });
            }, (err) => {
                this.res.json({
                    isSuccess: false,
                    message: err.message,
                    reservationId: []
                });
            });
        }
        else {
            this.res.json({
                isSuccess: false,
                message: this.req.__('Message.UnexpectedError'),
                reservationId: []
            });
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffCancelController;
