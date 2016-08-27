import BaseController from '../../BaseController';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

export default class StaffCancelController extends BaseController {
    public execute(): void {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            Models.Reservation['updateStatus2keptbytiff'](reservationIds, (err, raw) => {
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
