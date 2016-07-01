import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';
import moment = require('moment');

export default class ReserveController extends BaseController {
    /**
     * 空席状況マップを生成する
     */
    public showSeatsMap() {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.res.send('false');
            }

            // 予約リストを取得
            Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                },
                {},
                {},
                (err, reservationDocuments) => {

                    // 座席コードごとのオブジェクトに整形
                    let reservationDocumentsBySeatCode = {};
                    for (let reservationDocument of reservationDocuments) {
                        reservationDocumentsBySeatCode[reservationDocument.get('seat_code')] = reservationDocument;
                    }

                    if (err) {
                        this.res.send('false');
                    } else {
                        this.res.render('reserve/seatsMap', {
                            layout: false,
                            reservationDocumentsBySeatCode: reservationDocumentsBySeatCode,
                            reservationModel: reservationModel
                        });
                    }
                }
            );
        });
    }
}
