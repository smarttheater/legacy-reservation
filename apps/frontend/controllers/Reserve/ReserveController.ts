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
            if (err || reservationModel === null) {
                return this.res.json({
                    propertiesBySeatCode: {}
                });
            }




            let propertiesBySeatCode: {
                [seatCode: string]: {
                    classes: Array<string>,
                    attrs: Object
                };
            } = {};



            // 予約リストを取得
            let fields = 'seat_code status';
            if (reservationModel.purchaserGroup === ReservationUtil.PURCHASER_GROUP_STAFF) {
                fields = 'seat_code status staff staff_name staff_department_name sponsor sponsor_name member member_email';
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
                            let baloonContent = '';

                            if (reservationModel.seatCodes.indexOf(seatCode) >= 0) {
                                // 仮押さえ中
                                classes.push('select-seat', 'active');

                            } else {
                                // 予約不可
                                classes.push('disabled');

                            }

                            // 内部用コンテンツ
                            if (reservationModel.purchaserGroup === ReservationUtil.PURCHASER_GROUP_STAFF) {
                                baloonContent += this.getBaloonContent4staffs(reservationModel, reservationDocument);
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

    private getBaloonContent4staffs(reservationModel: ReservationModel, reservationDocument: mongoose.Document) :string {
        let baloonContent = '';

        // 内部関係者の場合、予約情報ポップアップ
        switch (reservationDocument.get('status')) {
            case ReservationUtil.STATUS_RESERVED:
                if (reservationDocument.get('staff')) {
                    baloonContent +=  `<br>内部関係者${reservationDocument.get('staff_department_name')}<br>${reservationDocument.get('staff_name')}`;
                } else if (reservationDocument.get('sponsor')) {
                    baloonContent +=  `<br>外部関係者${reservationDocument.get('sponsor_name')}`;
                } else if (reservationDocument.get('member')) {
                    baloonContent +=  `<br>メルマガ当選者${reservationDocument.get('member_email')}`;
                } else {
                    baloonContent +=  '<br>一般';
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
