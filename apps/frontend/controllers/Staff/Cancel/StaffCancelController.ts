import BaseController from '../../BaseController';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

export default class StaffCancelController extends BaseController {
    public execute(): void {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            let promises = [];
            let updatedReservationIds = [];

            for (let reservationId of reservationIds) {
                promises.push(new Promise((resolve, reject) => {
                    // TIFF確保にステータス更新
                    this.logger.debug('canceling reservation...id:', reservationId);
                    Models.Reservation.update(
                        {
                            _id: reservationId,
                            staff: this.req.staffUser.get('_id'),
                            purchaser_group: ReservationUtil.PURCHASER_GROUP_STAFF,
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        {
                            // 内部保留の所有者はadmin
                            // TODO 上書きする
                            status: ReservationUtil.STATUS_KEPT_BY_TIFF,
                            staff: null,
                            staff_user_id: 'admin',
                            sponsor: null
                        },
                        (err, raw) => {
                            if (err) {
                                reject(err);
                            } else {
                                updatedReservationIds.push(reservationId);
                                resolve();
                            }
                        }
                    );
                }));
            }

            Promise.all(promises).then(() => {
                this.res.json({
                    isSuccess: true,
                    reservationIds: updatedReservationIds
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
