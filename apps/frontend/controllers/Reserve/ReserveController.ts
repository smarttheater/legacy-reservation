import ReserveBaseController from '../ReserveBaseController';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';

export default class ReserveController extends ReserveBaseController {
    /**
     * 座席の状態を取得する
     */
    public getSeatProperties() {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.res.json({propertiesBySeatCode: {}});


            let propertiesBySeatCode: {
                [seatCode: string]: {
                    classes: Array<string>,
                    attrs: Object
                };
            } = {};



            // 予約リストを取得
            let fields = 'seat_code status';
            if (reservationModel.purchaserGroup === ReservationUtil.PURCHASER_GROUP_STAFF) {
                fields = null;
            }

            Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                },
                fields,
                {},
                (err, reservations) => {
                    if (err) {
                        this.res.json({
                            propertiesBySeatCode: propertiesBySeatCode
                        });

                    } else {

                        // 予約テーブルにあるものについて、状態を上書きする
                        for (let reservation of reservations) {
                            let seatCode = reservation.get('seat_code');

                            let classes = [];
                            let baloonContent = `${seatCode}`;

                            if (reservationModel.seatCodes.indexOf(seatCode) >= 0) {
                                // 仮押さえ中
                                classes.push('select-seat', 'active');
                            } else {
                                // 予約不可
                                classes.push('disabled');
                            }



                            // 内部関係者用
                            if (reservationModel.purchaserGroup === ReservationUtil.PURCHASER_GROUP_STAFF) {
                                baloonContent = reservation.get('baloon_content4staff');

                                // 内部関係者はTIFF確保も予約できる
                                if (reservation.get('status') === ReservationUtil.STATUS_KEPT_BY_TIFF) {
                                    classes = ['select-seat'];
                                }
                            }



                            propertiesBySeatCode[seatCode] = {
                                classes: classes,
                                attrs: {
                                    'data-baloon-content': baloonContent
                                }
                            };
                        }



                        this.res.json({
                            propertiesBySeatCode: propertiesBySeatCode
                        });
                    }
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
