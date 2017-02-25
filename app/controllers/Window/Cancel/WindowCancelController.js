"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const log4js = require("log4js");
const BaseController_1 = require("../../BaseController");
/**
 * 当日窓口座席予約キャンセルコントローラー
 *
 * @export
 * @class WindowCancelController
 * @extends {BaseController}
 */
class WindowCancelController extends BaseController_1.default {
    execute() {
        if (!this.req.windowUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const userId = this.req.windowUser.get('user_id');
        this.logger = log4js.getLogger('cancel');
        // 予約IDリストをjson形式で受け取る
        const reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            this.logger.info('removing reservation by window... window:', userId, 'reservationIds:', reservationIds);
            chevre_domain_1.Models.Reservation.remove({
                _id: { $in: reservationIds },
                purchaser_group: { $ne: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF } // 念のため、内部は除外
            }, (err) => {
                this.logger.info('reservation removed by window.', err, 'window:', userId, 'reservationIds:', reservationIds);
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
exports.default = WindowCancelController;
