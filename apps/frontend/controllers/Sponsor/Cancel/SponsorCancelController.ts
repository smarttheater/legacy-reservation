import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import sponsorCancelForm from '../../../forms/sponsor/sponsorCancelForm';

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
            (err, raw) => {
                if (err) {
                    this.res.json({
                        isSuccess: false,
                        messaeg: this.req.__('Message.UnexpectedError'),
                        reservationId: reservationId
                    });
                } else {
                    this.res.json({
                        isSuccess: true,
                        reservationId: reservationId
                    });
                }
            }
        );
    }
}
