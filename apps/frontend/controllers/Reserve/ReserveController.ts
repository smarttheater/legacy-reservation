import ReserveBaseController from '../ReserveBaseController';
import Util from '../../../common/Util/Util';
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
                    baloonContent: string, // バルーン内容
                    entered: boolean // 入場済みかどうか
                };
            } = {};

            // 予約リストを取得
            Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                },
                (err, reservations) => {
                    if (err) return  this.res.json({propertiesBySeatCode: {}});

                    // 予約データが存在すれば、現在仮押さえ中の座席を除いて予約不可(disabled)
                    for (let reservation of reservations) {
                        let seatCode = reservation.get('seat_code');
                        let avalilable = false;
                        let baloonContent = seatCode;

                        if (reservationModel.seatCodes.indexOf(seatCode) >= 0) {
                            // 仮押さえ中
                            avalilable = true;
                        }

                        // 内部関係者用
                        if (reservationModel.purchaserGroup === ReservationUtil.PURCHASER_GROUP_STAFF) {
                            baloonContent = reservation.get('baloon_content4staff');

                            // 内部関係者はTIFF確保も予約できる
                            if (reservation.get('status') === ReservationUtil.STATUS_KEPT_BY_TIFF) {
                                avalilable = true;
                            }
                        }

                        propertiesBySeatCode[seatCode] = {
                            avalilable: avalilable,
                            baloonContent: baloonContent,
                            entered: reservation.get('entered')
                        };
                    }

                    // 予約のない座席は全て空席
                    for (let seat of reservationModel.performance.screen.sections[0].seats) {
                        if (!propertiesBySeatCode.hasOwnProperty(seat.code)) {
                            propertiesBySeatCode[seat.code] = {
                                avalilable: true,
                                baloonContent: seat.code,
                                entered: false
                            };
                        }
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

        let png = Util.createQRCode(reservationId);
        this.res.setHeader('Content-Type', 'image/png');
        this.res.send(png);
    }
}
