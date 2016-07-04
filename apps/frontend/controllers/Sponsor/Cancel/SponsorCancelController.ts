import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ReservationCancelModel from '../../../models/Reserve/ReservationCancelModel';

export default class SponsorCancelController extends BaseController {
    public execute(): void {
        let token = this.req.body.token;
        ReservationCancelModel.find(token, (err, reservationCancelModel) => {
            if (err || reservationCancelModel === null) {
                return this.next(new Error('キャンセルプロセスが中断されました'));
            }


            let reservationId = this.req.body.reservation_id;

            // TIFF確保にステータス更新
            this.logger.debug('canceling reservation...id:', reservationId);
            Models.Reservation.findOneAndUpdate(
            {
                _id: reservationId,
                sponsor: this.sponsorUser.get('_id'),
            },
            {
                status: ReservationUtil.STATUS_KEPT_BY_TIFF
            },
            {
                new: true
            },
            (err, reservationDocument) => {
                if (err || reservationDocument === null) {
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
        });

    }
}
