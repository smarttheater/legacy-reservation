import BaseController from '../../BaseController';
import StaffUser from '../../../models/User/StaffUser';
import Util from '../../../../common/Util/Util';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import Models from '../../../../common/models/Models';
import mongoose = require('mongoose');

export default class StaffMyPageController extends BaseController {
    public index(): void {
        this.useMongoose(() => {
            Models.Reservation.find(
                {
                    staff: this.staffUser.get('_id'),
                    status: ReservationUtil.STATUS_RESERVED
                },
                {},
                {
                    sort : {staff: 1, seat_code: 1},
                    limit: 10
                }
            ).populate('staff screen').exec((err, reservationDocuments) => {
                mongoose.disconnect(() => {

                    if (err) {

                    } else {
                        // 予約番号ごとに整形
                        let reservationDocumentsByPaymentNo = {};
                        let screenSeatCodesByPaymentNo = {};
                        for (let reservationDocument of reservationDocuments) {
                            let paymentNo = reservationDocument.get('payment_no');
                            if (!reservationDocumentsByPaymentNo.hasOwnProperty(paymentNo)) {
                                reservationDocumentsByPaymentNo[paymentNo] = [];

                                let seats = reservationDocument.get('screen').get('sections')[0].get('seats');
                                screenSeatCodesByPaymentNo[paymentNo] = [];
                                for (let seat of seats) {
                                    screenSeatCodesByPaymentNo[paymentNo].push(seat.get('code'));
                                }
                            }

                            reservationDocumentsByPaymentNo[paymentNo].push(reservationDocument);
                        }

                        this.res.render('staff/mypage/index', {
                            layout: 'layouts/staff/layout',
                            reservationDocumentsByPaymentNo: reservationDocumentsByPaymentNo,
                            screenSeatCodesByPaymentNo: screenSeatCodesByPaymentNo,
                        });
                    }
                });
            });
        });
    }
}
