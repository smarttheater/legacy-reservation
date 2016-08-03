"use strict";
const ReserveBaseController_1 = require('../ReserveBaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const ReservationModel_1 = require('../../models/Reserve/ReservationModel');
class ReserveController extends ReserveBaseController_1.default {
    /**
     * 座席の状態を取得する
     */
    getSeatProperties() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.res.json({
                    propertiesBySeatCode: {}
                });
            }
            // 予約リストを取得
            Models_1.default.Reservation.find({
                performance: reservationModel.performance._id
            }, 'seat_code seat_grade_name seat_grade_name_en status staff staff_name staff_department_name sponsor sponsor_name member member_email', {}, (err, reservationDocuments) => {
                if (err) {
                    this.res.json({
                        propertiesBySeatCode: {}
                    });
                }
                else {
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
                        baloonContent += `<br>${reservationDocument.get('seat_grade_' + this.req.__('DocumentField.name'))}`;
                        if (reservationDocument.get('status') === ReservationUtil_1.default.STATUS_AVAILABLE) {
                            // 予約可能
                            classes.push('select-seat');
                        }
                        else {
                            if (seatCodesInReservation.indexOf(seatCode) >= 0) {
                                // 仮押さえ中
                                classes.push('select-seat', 'active');
                            }
                            else {
                                // 予約不可
                                classes.push('disabled');
                                // 内部関係者の場合、予約情報ポップアップ
                                if (reservationModel.staff) {
                                    switch (reservationDocument.get('status')) {
                                        case ReservationUtil_1.default.STATUS_RESERVED:
                                            if (reservationDocument.get('staff')) {
                                                baloonContent += `<br>内部関係者${reservationDocument.get('staff_department_name')}<br>${reservationDocument.get('staff_name')}`;
                                            }
                                            else if (reservationDocument.get('sponsor')) {
                                                baloonContent += `<br>外部関係者${reservationDocument.get('sponsor_name')}`;
                                            }
                                            else if (reservationDocument.get('member')) {
                                                baloonContent += `<br>メルマガ当選者${reservationDocument.get('member_email')}`;
                                            }
                                            else {
                                                baloonContent += '<br>一般';
                                            }
                                            break;
                                        case ReservationUtil_1.default.STATUS_TEMPORARY:
                                            baloonContent += '<br>仮予約中...';
                                            break;
                                        case ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT:
                                            baloonContent += '<br>決済中...';
                                            break;
                                        case ReservationUtil_1.default.STATUS_KEPT_BY_TIFF:
                                            baloonContent += '<br>TIFF確保中...';
                                            break;
                                        default:
                                            break;
                                    }
                                }
                                else {
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
            });
        });
    }
    /**
     * create barcode by reservation token and reservation id.
     */
    barcode() {
        let reservationId = this.req.params.reservationId;
        ReservationUtil_1.default.createBarcode(reservationId, (err, png) => {
            if (err) {
                this.res.send('false');
            }
            else {
                // `png` is a Buffer
                this.res.setHeader('Content-Type', 'image/png');
                this.res.send(png);
            }
        });
    }
    /**
     * create qrcode by reservation token and reservation id.
     */
    qrcode() {
        let reservationId = this.req.params.reservationId;
        let png = ReservationUtil_1.default.createQRCode(reservationId);
        this.res.setHeader('Content-Type', 'image/png');
        this.res.send(png);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReserveController;
