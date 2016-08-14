import ReserveBaseController from '../ReserveBaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';
import mongoose = require('mongoose');

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
                fields = 'seat_code status purchaser_group staff staff_name sponsor sponsor_name member member_email';
            }

            Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                },
                fields,
                {},
                (err, reservationDocuments) => {
                    if (err) {
                        this.res.json({
                            propertiesBySeatCode: propertiesBySeatCode
                        });

                    } else {

                        // 予約テーブルにあるものについて、状態を上書きする
                        for (let reservationDocument of reservationDocuments) {
                            let seatCode = reservationDocument.get('seat_code');

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
                                baloonContent += this.getBaloonContent4staffs(reservationDocument);
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

    private getBaloonContent4staffs(reservationDocument: mongoose.Document) :string {
        console.log(reservationDocument);
        let baloonContent = '';

        // 内部関係者の場合、予約情報ポップアップ
        let status = reservationDocument.get('status');
        let group = reservationDocument.get('purchaser_group');
        switch (status) {
            case ReservationUtil.STATUS_RESERVED:
                if (group === ReservationUtil.PURCHASER_GROUP_STAFF) {
                    baloonContent +=  `<br>内部関係者${reservationDocument.get('staff_name')}`;
                } else if (group === ReservationUtil.PURCHASER_GROUP_SPONSOR) {
                    baloonContent +=  `<br>外部関係者${reservationDocument.get('sponsor_name')}`;
                } else if (group === ReservationUtil.PURCHASER_GROUP_MEMBER) {
                    baloonContent +=  `<br>メルマガ当選者`;
                } else if (group === ReservationUtil.PURCHASER_GROUP_CUSTOMER) {
                    baloonContent +=  '<br>一般';
                } else if (group === ReservationUtil.PURCHASER_GROUP_WINDOW) {
                    baloonContent +=  '<br>窓口';
                }

                break;

            case ReservationUtil.STATUS_TEMPORARY:
                baloonContent += '<br>仮予約中...';
                break;

            case ReservationUtil.STATUS_WAITING_SETTLEMENT:
                baloonContent += '<br>決済中...';
                break;

            case ReservationUtil.STATUS_KEPT_BY_TIFF:
                baloonContent += '<br>TIFF確保中...';
                break;

            default:
                break;
        }


        return baloonContent;
    }

    /**
     * create barcode by reservation token and reservation id.
     */
    public barcode() {
        let reservationId = this.req.params.reservationId;

        ReservationUtil.createBarcode(reservationId, (err, png) => {
            if (err) {
                this.res.send('false');

            } else {
                // `png` is a Buffer
                this.res.setHeader('Content-Type', 'image/png');
                this.res.send(png);

            }

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
