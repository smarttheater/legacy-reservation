import BaseController from '../../BaseController';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import log4js = require('log4js');

export default class StaffCancelController extends BaseController {
    public execute(): void {
        this.logger = log4js.getLogger('cancel');

        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            this.logger.info('updateStatus2keptbytiff processing by staff... staff:', this.req.staffUser.get('user_id'), 'signature:', this.req.staffUser.get('signature'), 'ids:', reservationIds);
            Models.Reservation['updateStatus2keptbytiff'](reservationIds, (err, raw) => {
                this.logger.info('updateStatus2keptbytiff by staff processed.', err, raw, 'staff:', this.req.staffUser.get('user_id'), 'signature:', this.req.staffUser.get('signature'), 'ids:', reservationIds);
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
            });
        } else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError')
            });
        }
    }
}
