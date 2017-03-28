import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as log4js from 'log4js';
import BaseController from '../../BaseController';

/**
 * 当日窓口座席予約キャンセルコントローラー
 *
 * @export
 * @class WindowCancelController
 * @extends {BaseController}
 */
export default class WindowCancelController extends BaseController {
    public async execute(): Promise<void> {
        if (this.req.windowUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        const userId = this.req.windowUser.get('user_id');

        this.logger = log4js.getLogger('cancel');

        try {

            // 予約IDリストをjson形式で受け取る
            const reservationIds = JSON.parse(this.req.body.reservationIds);
            if (!Array.isArray(reservationIds)) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }

            this.logger.info('removing reservation by window... window:', userId, 'reservationIds:', reservationIds);
            await Models.Reservation.remove(
                {
                    _id: { $in: reservationIds },
                    purchaser_group: { $ne: ReservationUtil.PURCHASER_GROUP_STAFF } // 念のため、内部は除外
                }
            ).exec();
            this.logger.info('reservation removed by window.', 'window:', userId, 'reservationIds:', reservationIds);

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
