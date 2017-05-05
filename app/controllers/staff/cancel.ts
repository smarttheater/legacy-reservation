import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as createDebug from 'debug';

import BaseController from '../base';

const debug = createDebug('chevre-frontend:controller:staffCancel');

/**
 * 内部関係者座席予約キャンセルコントローラー
 *
 * @export
 * @class StaffCancelController
 * @extends {BaseController}
 */
export default class StaffCancelController extends BaseController {
    public async execute(): Promise<void> {
        if (this.req.staffUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }
        const staffUser = this.req.staffUser;

        try {
            // 予約IDリストをjson形式で受け取る
            const reservationIds = JSON.parse(this.req.body.reservationIds);
            if (!Array.isArray(reservationIds)) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }

            const promises = reservationIds.map(async (id) => {
                debug(
                    'updating to STATUS_KEPT_BY_CHEVRE by staff... staff:', staffUser.get('user_id'),
                    'signature:', staffUser.get('signature'),
                    'id:', id
                );
                const reservation = await Models.Reservation.findOneAndUpdate(
                    { _id: id },
                    { status: ReservationUtil.STATUS_KEPT_BY_CHEVRE },
                    { new: true }
                ).exec();
                debug(
                    'updated to STATUS_KEPT_BY_CHEVRE by staff.', reservation,
                    'staff:', staffUser.get('user_id'),
                    'signature:', staffUser.get('signature'),
                    'id:', id
                );
            });

            await Promise.all(promises);

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
