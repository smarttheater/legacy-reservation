import ReserveBaseController from '../ReserveBaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../models/Reserve/ReservationResultModel';

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

            // 予約リストを取得
            Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                },
                'seat_code status staff staff_name staff_department_name sponsor sponsor_name member member_email',
                {},
                (err, reservationDocuments) => {
                    if (err) {
                        this.res.json({
                            propertiesBySeatCode: {}
                        });

                    } else {
                        // 仮押さえ中の座席コードリスト
                        let seatCodesInReservation = reservationModel.getSeatCodes();

                        let propertiesBySeatCode = {};

                        for (let reservationDocument of reservationDocuments) {
                            let seatCode = reservationDocument.get('seat_code');

                            let properties = {};
                            let classes = [];
                            let attrs = {};



                            attrs['data-reservation-id'] = reservationDocument.get('_id');

                            let baloonContent = reservationDocument.get('seat_code');

                            if (reservationDocument.get('status') === ReservationUtil.STATUS_AVAILABLE) {
                                // 予約可能
                                classes.push('select-seat');

                            } else {
                                if (seatCodesInReservation.indexOf(seatCode) >= 0) {
                                    // 仮押さえ中
                                    classes.push('select-seat', 'active');

                                } else {

                                    // 予約不可
                                    classes.push('disabled');


                                    // 内部関係者の場合、予約情報ポップアップ
                                    if (reservationModel.staff) {

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

                                    } else {

                                    }

                                }

                            }



                            attrs['data-baloon-content'] = baloonContent;

                            properties['classes'] = classes;
                            properties['attrs'] = attrs;
                            propertiesBySeatCode[seatCode] = properties;
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
     * 予約情報メールを送信する
     */
    public email(): void {
        let id = this.req.body.id;
        Models.Reservation.findOne(
            {
                _id: id,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservationDocument) => {
                if (err || reservationDocument === null) {
                    this.res.json({
                        isSuccess: false
                    });

                } else {

                    let to: string;
                    if (reservationDocument.get('staff_email')) {
                        to = reservationDocument.get('staff_email');
                    } else if (reservationDocument.get('sponsor_email')) {
                        to = reservationDocument.get('sponsor_email');
                    } else if (reservationDocument.get('purchaser_email')) {
                        to = reservationDocument.get('purchaser_email');
                    } else {
                    }

                    if (to) {
                        this.sendCompleteEmail(to, [reservationDocument], (err, json) => {
                            if (err) {
                                // TODO log
                                this.res.json({
                                    isSuccess: false
                                });

                            } else {
                                this.res.json({
                                    isSuccess: true
                                });

                            }

                        });

                    } else {
                        this.res.json({
                            isSuccess: false
                        });

                    }
                }
            }
        );
    }

    /**
     * create barcode by reservation token and reservation id.
     */
    public barcode() {
        let token = this.req.params.token;
        let reservationId = this.req.params.reservationId;

        // getting reservation document from redis by reservationId...
        ReservationResultModel.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.res.send('false');
            }

            let reservation;
            for (let reservedDocument of reservationResultModel.reservedDocuments) {
                if (reservedDocument._id == reservationId) {
                    reservation = reservedDocument;
                    break;
                }
            }

            if (!reservation) {
                return this.res.send('false'); 
            }

            ReservationUtil.createBarcode(reservation._id, (err, png) => {
                if (err) {
                    this.res.send('false');

                } else {
                    // `png` is a Buffer
                    this.res.setHeader('Content-Type', 'image/png');
                    this.res.send(png);

                }

            });

        });

    }

    /**
     * create qrcode by reservation token and reservation id.
     */
    public qrcode() {
        let token = this.req.params.token;
        let reservationId = this.req.params.reservationId;

        // getting reservation document from redis by reservationId...
        ReservationResultModel.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.res.send('false');
            }

            let reservation;
            for (let reservedDocument of reservationResultModel.reservedDocuments) {
                if (reservedDocument._id == reservationId) {
                    reservation = reservedDocument;
                    break;
                }
            }

            if (!reservation) {
                return this.res.send('false'); 
            }

            let png = ReservationUtil.createQRCode(reservation._id);
            this.res.setHeader('Content-Type', 'image/png');
            png.pipe(this.res);

        });

    }
}
