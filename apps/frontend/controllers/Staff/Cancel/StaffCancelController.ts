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
            let promises = reservationIds.map((id) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('updating to STATUS_KEPT_BY_TTTS by staff... staff:', this.req.staffUser.get('user_id'), 'signature:', this.req.staffUser.get('signature'), 'id:', id);
                    Models.Reservation.findOneAndUpdate(
                        {_id: id},
                        {status: ReservationUtil.STATUS_KEPT_BY_TTTS},
                        {new: true},
                        (err, raw) => {
                            this.logger.info('updated to STATUS_KEPT_BY_TTTS by staff.', err, raw, 'staff:', this.req.staffUser.get('user_id'), 'signature:', this.req.staffUser.get('signature'), 'id:', id);
                            (err) ? reject(err) : resolve();
                        }
                    );
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
        } else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError')
            });
        }
    }
}
