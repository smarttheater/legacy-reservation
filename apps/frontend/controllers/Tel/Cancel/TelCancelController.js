"use strict";
const BaseController_1 = require("../../BaseController");
const Models_1 = require("../../../../common/models/Models");
const ReservationUtil_1 = require("../../../../common/models/Reservation/ReservationUtil");
const log4js = require("log4js");
class TelCancelController extends BaseController_1.default {
    execute() {
        this.logger = log4js.getLogger('cancel');
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            this.logger.info('removing reservation by tel_staff... tel:', this.req.telStaffUser.get('user_id'), 'reservationIds:', reservationIds);
            Models_1.default.Reservation.remove({
                _id: { $in: reservationIds },
                purchaser_group: { $ne: ReservationUtil_1.default.PURCHASER_GROUP_STAFF },
            }, (err) => {
                this.logger.info('reservation removed by tel_staff.', err, 'tel:', this.req.telStaffUser.get('user_id'), 'reservationIds:', reservationIds);
                if (err) {
                    this.res.json({
                        success: false,
                        message: err.message
                    });
                }
                else {
                    this.res.json({
                        success: true,
                        message: null
                    });
                }
            });
        }
        else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError')
            });
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelCancelController;
