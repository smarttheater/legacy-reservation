"use strict";
const BaseController_1 = require('../../BaseController');
const Models_1 = require('../../../../common/models/Models');
class StaffCancelController extends BaseController_1.default {
    execute() {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            Models_1.default.Reservation['updateStatus2keptbytiff'](reservationIds, (err, raw) => {
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
exports.default = StaffCancelController;
