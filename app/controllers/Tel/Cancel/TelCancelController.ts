import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as log4js from 'log4js';
import BaseController from '../../BaseController';

/**
 * 電話窓口座席予約キャンセルコントローラー
 *
 * @export
 * @class TelCancelController
 * @extends {BaseController}
 */
export default class TelCancelController extends BaseController {
    public async execute(): Promise<void> {
        if (this.req.telStaffUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        const userId = this.req.telStaffUser.get('user_id');

        this.logger = log4js.getLogger('cancel');

        try {
            // 予約IDリストをjson形式で受け取る
            const reservationIds = JSON.parse(this.req.body.reservationIds);
            if (!Array.isArray(reservationIds)) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }

            this.logger.info('removing reservation by tel_staff... tel:', userId, 'reservationIds:', reservationIds);
            await Models.Reservation.remove(
                {
                    _id: { $in: reservationIds },
                    purchaser_group: { $ne: ReservationUtil.PURCHASER_GROUP_STAFF } // 念のため、内部は除外
                }
            ).exec();
            this.logger.info('reservation removed by tel_staff.', 'tel:', userId, 'reservationIds:', reservationIds);

            this.res.json({
                success: true,
                message: null
            });
        } catch (error) {
            this.res.json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * 内部確保(作業用２の座席に変更する)
     */
    public async execute2sagyo(): Promise<void> {
        if (this.req.telStaffUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        const userId = this.req.telStaffUser.get('user_id');

        this.logger = log4js.getLogger('cancel');

        try {
            // 予約IDリストをjson形式で受け取る
            const reservationIds = JSON.parse(this.req.body.reservationIds);
            if (!Array.isArray(reservationIds)) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }

            const staff = await Models.Staff.findOne(
                {
                    user_id: '2016sagyo2'
                }
            ).exec();
            this.logger.info('staff found.', staff);

            this.logger.info('updating reservations...');
            const raw = await Models.Reservation.update(
                {
                    _id: { $in: reservationIds },
                    purchaser_group: { $ne: ReservationUtil.PURCHASER_GROUP_STAFF } // 念のため、内部は除外
                },
                {
                    status: ReservationUtil.STATUS_RESERVED,
                    purchaser_group: ReservationUtil.PURCHASER_GROUP_STAFF,
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
                },
                {
                    multi: true
                }
            ).exec();
            this.logger.info('reservation 2sagyo by tel_staff.', raw, 'tel:', userId, 'reservationIds:', reservationIds);

            this.res.json({
                success: true,
                message: null
            });
        } catch (error) {
            this.res.json({
                success: false,
                message: error.message
            });
        }
    }
}
