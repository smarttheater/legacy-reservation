"use strict";
const BaseController_1 = require('../../BaseController');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
class SponsorCancelController extends BaseController_1.default {
    execute() {
        let reservationId = this.req.body.reservation_id;
        // TIFF確保にステータス更新
        this.logger.debug('canceling reservation...id:', reservationId);
        Models_1.default.Reservation.update({
            _id: reservationId,
            sponsor: this.sponsorUser.get('_id'),
        }, {
            status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
        }, (err, raw) => {
            if (err) {
                this.res.json({
                    isSuccess: false,
                    messaeg: this.req.__('Message.UnexpectedError'),
                    reservationId: reservationId
                });
            }
            else {
                this.res.json({
                    isSuccess: true,
                    reservationId: reservationId
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorCancelController;
