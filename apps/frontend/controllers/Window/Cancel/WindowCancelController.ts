import BaseController from '../../BaseController';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import log4js = require('log4js');

export default class WindowCancelController extends BaseController {
    public execute(): void {
        this.logger = log4js.getLogger('cancel');

        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            this.logger.info('removing reservation by window... window:', this.req.windowUser.get('user_id'), 'reservationIds:', reservationIds);
            Models.Reservation.remove(
                {
                    _id: {$in: reservationIds},
                    purchaser_group: {$ne: ReservationUtil.PURCHASER_GROUP_STAFF}, // 念のため、内部は除外
                },
                (err) => {
                    this.logger.info('reservation removed by window.', err, 'window:', this.req.windowUser.get('user_id'), 'reservationIds:', reservationIds);
                    if (err) {
                        this.res.json({
                            success: false,
                            message: err.message
                        });
                    } else {
                        this.res.json({
                            success: true,
                            message: null
                        });
                    }
                }
            );
        } else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError')
            });
        }
    }
}
