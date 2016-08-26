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
                fields = null;
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
                            baloonContent = reservation.get('baloon_content4staff');
                            // 内部関係者はTIFF確保も予約できる
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
