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
            if (err)
                return this.res.json({ propertiesBySeatCode: {} });
            let propertiesBySeatCode = {};
            // 予約リストを取得
            let fields = 'seat_code status';
            if (reservationModel.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_STAFF) {
                fields = 'seat_code status purchaser_group staff staff_name sponsor sponsor_name member member_email';
            }
            Models_1.default.Reservation.find({
                performance: reservationModel.performance._id
            }, fields, {}, (err, reservations) => {
                if (err) {
                    this.res.json({
                        propertiesBySeatCode: propertiesBySeatCode
                    });
                }
                else {
                    // 予約テーブルにあるものについて、状態を上書きする
                    for (let reservation of reservations) {
                        let seatCode = reservation.get('seat_code');
                        let classes = [];
                        let baloonContent = `${seatCode}`;
                        if (reservationModel.seatCodes.indexOf(seatCode) >= 0) {
                            // 仮押さえ中
                            classes.push('select-seat', 'active');
                        }
                        else {
                            // 予約不可
                            classes.push('disabled');
                        }
                        // 内部関係者用
                        if (reservationModel.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_STAFF) {
                            baloonContent += this.getBaloonContent4staffs(reservation);
                            if (reservation.get('status') === ReservationUtil_1.default.STATUS_KEPT_BY_TIFF) {
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
            });
        });
    }
    getBaloonContent4staffs(reservation) {
        let baloonContent = '';
        // 内部関係者の場合、予約情報ポップアップ
        let status = reservation.get('status');
        let group = reservation.get('purchaser_group');
        switch (status) {
            case ReservationUtil_1.default.STATUS_RESERVED:
                if (group === ReservationUtil_1.default.PURCHASER_GROUP_STAFF) {
                    baloonContent += `<br>内部関係者${reservation.get('staff_name')}`;
                }
                else if (group === ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR) {
                    baloonContent += `<br>外部関係者${reservation.get('sponsor_name')}`;
                }
                else if (group === ReservationUtil_1.default.PURCHASER_GROUP_MEMBER) {
                    baloonContent += `<br>メルマガ当選者`;
                }
                else if (group === ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER) {
                    baloonContent += '<br>一般';
                }
                else if (group === ReservationUtil_1.default.PURCHASER_GROUP_TEL) {
                    baloonContent += '<br>電話窓口';
                }
                else if (group === ReservationUtil_1.default.PURCHASER_GROUP_WINDOW) {
                    baloonContent += '<br>当日窓口';
                }
                break;
            case ReservationUtil_1.default.STATUS_TEMPORARY:
            case ReservationUtil_1.default.STATUS_TEMPORARY_ON_KEPT_BY_TIFF:
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
        return baloonContent;
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
