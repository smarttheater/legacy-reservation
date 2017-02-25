"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const log4js = require("log4js");
const BaseController_1 = require("../../BaseController");
/**
 * 電話窓口座席予約キャンセルコントローラー
 *
 * @export
 * @class TelCancelController
 * @extends {BaseController}
 */
class TelCancelController extends BaseController_1.default {
    execute() {
        if (!this.req.telStaffUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const userId = this.req.telStaffUser.get('user_id');
        this.logger = log4js.getLogger('cancel');
        // 予約IDリストをjson形式で受け取る
        const reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            this.logger.info('removing reservation by tel_staff... tel:', userId, 'reservationIds:', reservationIds);
            chevre_domain_1.Models.Reservation.remove({
                _id: { $in: reservationIds },
                purchaser_group: { $ne: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF } // 念のため、内部は除外
            }, (err) => {
                this.logger.info('reservation removed by tel_staff.', err, 'tel:', userId, 'reservationIds:', reservationIds);
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
    /**
     * 内部確保(作業用２の座席に変更する)
     */
    execute2sagyo() {
        if (!this.req.telStaffUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const userId = this.req.telStaffUser.get('user_id');
        this.logger = log4js.getLogger('cancel');
        // 予約IDリストをjson形式で受け取る
        const reservationIds = JSON.parse(this.req.body.reservationIds);
        if (!Array.isArray(reservationIds)) {
            this.res.json({ success: false, message: this.req.__('Message.UnexpectedError') });
            return;
        }
        chevre_domain_1.Models.Staff.findOne({
            user_id: '2016sagyo2'
        }, (err, staff) => {
            this.logger.info('staff found.', err, staff);
            if (err) {
                this.res.json({ success: false, message: err.message });
            }
            else {
                this.logger.info('updating reservations...');
                chevre_domain_1.Models.Reservation.update({
                    _id: { $in: reservationIds },
                    purchaser_group: { $ne: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF } // 念のため、内部は除外
                }, {
                    status: chevre_domain_2.ReservationUtil.STATUS_RESERVED,
                    purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF,
                    charge: 0,
                    ticket_type_charge: 0,
                    ticket_type_name_en: 'Free',
                    ticket_type_name_ja: '無料',
                    ticket_type_code: '00',
                    staff: staff.get('_id'),
                    staff_user_id: staff.get('user_id'),
                    staff_email: staff.get('email'),
                    staff_name: staff.get('name'),
                    staff_signature: 'system',
                    updated_user: 'system',
                    // "purchased_at": Date.now(), // 購入日更新しない
                    watcher_name_updated_at: null,
                    watcher_name: ''
                }, {
                    multi: true
                }, (updateReservationErr, raw) => {
                    this.logger.info('reservation 2sagyo by tel_staff.', updateReservationErr, raw, 'tel:', userId, 'reservationIds:', reservationIds);
                    if (updateReservationErr) {
                        this.res.json({ success: false, message: updateReservationErr.message });
                    }
                    else {
                        this.res.json({
                            success: true,
                            message: null
                        });
                    }
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelCancelController;
