"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const chevre_domain_3 = require("@motionpicture/chevre-domain");
const session_1 = require("../../models/reserve/session");
const ReserveBaseController_1 = require("../ReserveBaseController");
/**
 * 座席予約状態参照コントローラー
 *
 * @export
 * @class ReserveController
 * @extends {ReserveBaseController}
 */
class ReserveController extends ReserveBaseController_1.default {
    /**
     * 座席の状態を取得する
     */
    getUnavailableSeatCodes() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const seatCodes = yield chevre_domain_1.Models.Reservation.distinct('seat_code', {
                    performance: this.req.params.performanceId
                }).exec();
                this.res.json(seatCodes);
            }
            catch (error) {
                this.res.json([]);
            }
        });
    }
    /**
     * 座席の状態を取得する
     */
    getSeatProperties() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                const reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.res.json({ propertiesBySeatCode: {} });
                    return;
                }
                const propertiesBySeatCode = {};
                // 予約リストを取得
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    performance: reservationModel.performance._id
                }).exec();
                // 予約データが存在すれば、現在仮押さえ中の座席を除いて予約不可(disabled)
                reservations.forEach((reservation) => {
                    const seatCode = reservation.get('seat_code');
                    let avalilable = false;
                    let baloonContent = seatCode;
                    if (reservationModel.seatCodes.indexOf(seatCode) >= 0) {
                        // 仮押さえ中
                        avalilable = true;
                    }
                    // 内部関係者用
                    if (reservationModel.purchaserGroup === chevre_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF) {
                        baloonContent = reservation.get('baloon_content4staff');
                        // 内部関係者はCHEVRE確保も予約できる
                        if (reservation.get('status') === chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_CHEVRE) {
                            avalilable = true;
                        }
                    }
                    propertiesBySeatCode[seatCode] = {
                        avalilable: avalilable,
                        baloonContent: baloonContent,
                        entered: reservation.get('checked_in')
                    };
                });
                // 予約のない座席は全て空席
                reservationModel.performance.screen.sections[0].seats.forEach((seat) => {
                    if (!propertiesBySeatCode.hasOwnProperty(seat.code)) {
                        propertiesBySeatCode[seat.code] = {
                            avalilable: true,
                            baloonContent: seat.code,
                            entered: false
                        };
                    }
                });
                this.res.json({
                    propertiesBySeatCode: propertiesBySeatCode
                });
            }
            catch (error) {
                this.res.json({ propertiesBySeatCode: {} });
            }
        });
    }
    /**
     * 印刷
     */
    print() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ids = JSON.parse(this.req.query.ids);
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    _id: { $in: ids },
                    status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                }).exec();
                if (reservations.length === 0) {
                    this.next(new Error(this.req.__('Message.NotFound')));
                    return;
                }
                reservations.sort((a, b) => {
                    return chevre_domain_3.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });
                this.res.render('reserve/print', {
                    layout: false,
                    reservations: reservations
                });
            }
            catch (error) {
                console.error(error);
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
}
exports.default = ReserveController;
