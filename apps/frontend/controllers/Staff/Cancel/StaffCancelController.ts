import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

export default class StaffCancelController extends BaseController {
    public execute(): void {

        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {

            let promises: Array<Promise<Function>> = [];
            let updatedReservationIds = [];

            for (let reservationId of reservationIds) {
                promises.push(new Promise((resolve, reject) => {

                    // TIFF確保にステータス更新
                    this.logger.debug('canceling reservation...id:', reservationId);
                    Models.Reservation.update(
                    {
                        _id: reservationId,
                        staff: this.staffUser.get('_id'),
                    },
                    {
                        status: ReservationUtil.STATUS_KEPT_BY_TIFF
                    },
                    (err, affectedRows) => {
                        if (err || affectedRows === 0) {
                        } else {
                            updatedReservationIds.push(reservationId);
                        }

                        resolve();
                    });

                }));
            }


            Promise.all(promises).then(() => {
                // 変更できていない予約があった場合
                if (reservationIds.length > updatedReservationIds.length) {

                    this.res.json({
                        isSuccess: false,
                        reservationIds: updatedReservationIds
                    });
                } else {

                    this.res.json({
                        isSuccess: true,
                        reservationIds: updatedReservationIds
                    });
                }

            }, (err) => {
                this.res.json({
                    isSuccess: false,
                    reservationId: []
                });
            });

        } else {
            this.res.json({
                isSuccess: false,
                reservationId: []
            });
        }


    }
}
