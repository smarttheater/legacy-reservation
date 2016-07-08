import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

export default class SponsorCancelController extends BaseController {
    public execute(): void {
        let reservationId = this.req.body.reservation_id;

        // TIFF確保にステータス更新
        this.logger.debug('canceling reservation...id:', reservationId);
        Models.Reservation.update(
        {
            _id: reservationId,
            sponsor: this.sponsorUser.get('_id'),
        },
        {
            status: ReservationUtil.STATUS_KEPT_BY_TIFF
        },
        (err, affectedRows) => {
            if (err || affectedRows === 0) {
                this.res.json({
                    isSuccess: false,
                    reservationId: reservationId
                });
            } else {
                this.res.json({
                    isSuccess: true,
                    reservationId: reservationId
                });
            }
        });

    }
}
