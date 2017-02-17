"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const log4js = require("log4js");
const BaseController_1 = require("../../BaseController");
class StaffCancelController extends BaseController_1.default {
    execute() {
        if (!this.req.staffUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const staffUser = this.req.staffUser;
        this.logger = log4js.getLogger('cancel');
        // 予約IDリストをjson形式で受け取る
        const reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            const promises = reservationIds.map((id) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('updating to STATUS_KEPT_BY_TTTS by staff... staff:', staffUser.get('user_id'), 'signature:', staffUser.get('signature'), 'id:', id);
                    ttts_domain_1.Models.Reservation.findOneAndUpdate({ _id: id }, { status: ttts_domain_2.ReservationUtil.STATUS_KEPT_BY_TTTS }, { new: true }, (err, raw) => {
                        this.logger.info('updated to STATUS_KEPT_BY_TTTS by staff.', err, raw, 'staff:', staffUser.get('user_id'), 'signature:', staffUser.get('signature'), 'id:', id);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.res.json({
                    success: true,
                    message: null
                });
            }, (err) => {
                this.res.json({
                    success: false,
                    message: err.message
                });
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
exports.default = StaffCancelController;
