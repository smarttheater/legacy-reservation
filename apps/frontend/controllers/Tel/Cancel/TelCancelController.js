"use strict";
const BaseController_1 = require('../../BaseController');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
class TelCancelController extends BaseController_1.default {
    execute() {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            let promises = [];
            let canceledReservationIds = [];
            for (let reservationId of reservationIds) {
                promises.push(new Promise((resolve, reject) => {
                    // 予約削除
                    Models_1.default.Reservation.remove({
                        _id: reservationId,
                        purchaser_group: { $ne: ReservationUtil_1.default.PURCHASER_GROUP_STAFF },
                        status: ReservationUtil_1.default.STATUS_RESERVED
                    }, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            canceledReservationIds.push(reservationId);
                            resolve();
                        }
                    });
                }));
            }
            Promise.all(promises).then(() => {
                this.res.json({
                    isSuccess: true,
                    reservationIds: canceledReservationIds
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
exports.default = TelCancelController;
