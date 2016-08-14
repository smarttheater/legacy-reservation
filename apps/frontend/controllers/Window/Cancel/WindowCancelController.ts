import BaseController from '../../BaseController';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

export default class WindowCancelController extends BaseController {
    public execute(): void {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            let promises = [];
            let canceledReservationIds = [];

            for (let reservationId of reservationIds) {
                promises.push(new Promise((resolve, reject) => {
                    // 予約削除
                    Models.Reservation.remove(
                        {
                            _id: reservationId,
                            purchaser_group: {$ne: ReservationUtil.PURCHASER_GROUP_STAFF}, // 念のため、内部は除外
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                canceledReservationIds.push(reservationId);
                                resolve();
                            }
                        }
                    );
                }));
            }

            Promise.all(promises).then(() => {
                this.res.json({
                    isSuccess: true,
                    reservationIds: canceledReservationIds
                });
            }, (err) => {
                this.res.json({
                    isSuccess: false,
                    message: err.message,
                    reservationId: []
                });
            });

        } else {
            this.res.json({
                isSuccess: false,
                message: this.req.__('Message.UnexpectedError'),
                reservationId: []
            });
        }
    }
}
