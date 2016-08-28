import ReserveBaseController from '../ReserveBaseController';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';

export default class ReserveController extends ReserveBaseController {
    /**
     * 座席の状態を取得する
     */
    public getUnavailableSeatCodes() {
        let performanceId = this.req.params.performanceId;
        Models.Reservation.distinct(
            'seat_code',
            {
                performance: performanceId
            },
            (err, seatCodes) => {
                if (err) return  this.res.json([]);

                this.res.json(seatCodes);
            }
        );
    }

    /**
     * 座席の状態を取得する
     */
    public getSeatProperties() {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.res.json({propertiesBySeatCode: {}});

            let propertiesBySeatCode: {
                [seatCode: string]: {
                    avalilable: boolean, // 予約可能かどうか
                    attrs: Object // htmlのattrs
                };
            } = {};

            // 予約リストを取得
            let fields = (reservationModel.purchaserGroup === ReservationUtil.PURCHASER_GROUP_STAFF) ? null : 'seat_code';
            Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                },
                fields,
                (err, reservations) => {
                    if (err) return  this.res.json({propertiesBySeatCode: {}});

                    // 予約データが存在すれば、現在仮押さえ中の座席を除いて予約不可(disabled)
                    for (let reservation of reservations) {
                        let seatCode = reservation.get('seat_code');
                        let avalilable = false;
                        let attrs = {};

                        if (reservationModel.seatCodes.indexOf(seatCode) >= 0) {
                            // 仮押さえ中
                            avalilable = true;
                        }

                        // 内部関係者用
                        if (reservationModel.purchaserGroup === ReservationUtil.PURCHASER_GROUP_STAFF) {
                            attrs['data-baloon-content'] = reservation.get('baloon_content4staff');

                            // 内部関係者はTIFF確保も予約できる
                            if (reservation.get('status') === ReservationUtil.STATUS_KEPT_BY_TIFF) {
                                avalilable = true;
                            }
                        }

                        propertiesBySeatCode[seatCode] = {
                            avalilable: avalilable,
                            attrs: attrs
                        };
                    }

                    this.res.json({
                        propertiesBySeatCode: propertiesBySeatCode
                    });
                }
            );
        });
    }

    /**
     * create qrcode by reservation token and reservation id.
     */
    public qrcode() {
        let reservationId = this.req.params.reservationId;

        let png = ReservationUtil.createQRCode(reservationId);
        this.res.setHeader('Content-Type', 'image/png');
        this.res.send(png);
    }
}
