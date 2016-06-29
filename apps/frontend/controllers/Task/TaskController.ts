import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import moment = require('moment');

export default class TaskController extends BaseController {
    public removeTemporaryReservation(): void {
        // 仮予約ステータスで、一定時間過ぎた予約を削除する
        this.logger.info('removing temporary reservations...');
        Models.Reservation.remove(
            {
                status: ReservationUtil.STATUS_TEMPORARY,
                updated_dt: {
                    $lt: moment().add('minutes', -10).toISOString(),
                },
            },
        (err) => {
            this.logger.info('remove processed.', err);

            // 失敗しても、次のタスクにまかせる(気にしない)
            if (err) {
            } else {
                this.res.send('success');
            }
        });
    }
}
