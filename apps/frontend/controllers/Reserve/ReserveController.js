"use strict";
const ReserveBaseController_1 = require('../ReserveBaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const ReservationModel_1 = require('../../models/Reserve/ReservationModel');
class ReserveController extends ReserveBaseController_1.default {
    /**
     * 座席の状態を取得する
     */
    getUnavailableSeatCodes() {
        let performanceId = this.req.params.performanceId;
        Models_1.default.Reservation.distinct('seat_code', {
            performance: performanceId
        }, (err, seatCodes) => {
            if (err)
                return this.res.json([]);
            this.res.json(seatCodes);
        });
    }
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
            let fields = (reservationModel.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_STAFF) ? null : 'seat_code';
            Models_1.default.Reservation.find({
                performance: reservationModel.performance._id
            }, fields, (err, reservations) => {
                if (err)
                    return this.res.json({ propertiesBySeatCode: {} });
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
                    if (reservationModel.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_STAFF) {
                        baloonContent = reservation.get('baloon_content4staff');
                        // 内部関係者はTIFF確保も予約できる
                        if (reservation.get('status') === ReservationUtil_1.default.STATUS_KEPT_BY_TIFF) {
                            avalilable = true;
                        }
                    }
                    propertiesBySeatCode[seatCode] = {
                        avalilable: avalilable,
                        baloonContent: baloonContent
                    };
                }
                // 予約のない座席は全て空席
                for (let seat of reservationModel.performance.screen.sections[0].seats) {
                    if (!propertiesBySeatCode.hasOwnProperty(seat.code)) {
                        propertiesBySeatCode[seat.code] = {
                            avalilable: true,
                            baloonContent: seat.code
                        };
                    }
                }
                this.res.json({
                    propertiesBySeatCode: propertiesBySeatCode
                });
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
