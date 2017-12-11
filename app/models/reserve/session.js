"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const conf = require("config");
const moment = require("moment");
const MAX_RESERVATION_SEATS_DEFAULT = 4;
const MAX_RESERVATION_SEATS_LIMITED_PERFORMANCES = 10;
/**
 * 予約情報モデル
 *
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 *
 * @export
 * @class PlaceOrderTransactionSession
 */
class PlaceOrderTransactionSession {
    /**
     * プロセス中の購入情報をセッションから取得する
     */
    static FIND(req) {
        const reservationModelInSession = req.session[PlaceOrderTransactionSession.SESSION_KEY];
        if (reservationModelInSession === undefined) {
            return null;
        }
        const reservationModel = new PlaceOrderTransactionSession();
        Object.keys(reservationModelInSession).forEach((propertyName) => {
            reservationModel[propertyName] = reservationModelInSession[propertyName];
        });
        return reservationModel;
    }
    /**
     * プロセス中の購入情報をセッションから削除する
     */
    static REMOVE(req) {
        delete req.session[PlaceOrderTransactionSession.SESSION_KEY];
    }
    /**
     * プロセス中の購入情報をセッションに保存する
     */
    save(req) {
        req.session[PlaceOrderTransactionSession.SESSION_KEY] = this;
    }
    /**
     * 一度の購入で予約できる座席数を取得する
     */
    getSeatsLimit() {
        let limit = MAX_RESERVATION_SEATS_DEFAULT;
        if (this.performance !== undefined) {
            // 制限枚数指定のパフォーマンスの場合
            const performanceIds4limit2 = conf.get('performanceIds4limit2');
            if (performanceIds4limit2.indexOf(this.performance._id) >= 0) {
                limit = MAX_RESERVATION_SEATS_LIMITED_PERFORMANCES;
            }
        }
        return limit;
    }
    /**
     * 合計金額を算出する
     */
    getTotalCharge() {
        let total = 0;
        if (Array.isArray(this.seatCodes)) {
            this.seatCodes.forEach((seatCode) => {
                total += this.getChargeBySeatCode(seatCode);
            });
        }
        return total;
    }
    /**
     * 座席単体の料金を算出する
     */
    getChargeBySeatCode(seatCode) {
        let charge = 0;
        const reservation = this.getReservation(seatCode);
        if (reservation.ticket_type_charge !== undefined) {
            charge += reservation.ticket_type_charge;
            charge += this.getChargeExceptTicketTypeBySeatCode(seatCode);
        }
        return charge;
    }
    getChargeExceptTicketTypeBySeatCode(seatCode) {
        let charge = 0;
        const reservation = this.getReservation(seatCode);
        // 座席グレード分加算
        if (reservation.seat_grade_additional_charge > 0) {
            charge += reservation.seat_grade_additional_charge;
        }
        return charge;
    }
    /**
     * 座席コードから予約情報を取得する
     */
    getReservation(seatCode) {
        return (this[`reservation_${seatCode}`] !== undefined) ? this[`reservation_${seatCode}`] : null;
    }
    /**
     * 座席コードの予約情報をセットする
     */
    setReservation(seatCode, reservation) {
        this[`reservation_${seatCode}`] = reservation;
    }
    /**
     * 座席コードから予約(確定)ドキュメントを作成する
     * @param {string} seatCode 座席コード
     */
    seatCode2reservationDocument(seatCode) {
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservation = this.getReservation(seatCode);
        const doc = {
            status: reservation.status_after,
            seat_code: seatCode,
            seat_grade_name: reservation.seat_grade_name,
            seat_grade_additional_charge: reservation.seat_grade_additional_charge,
            ticket_type: reservation.ticket_type,
            ticket_type_name: reservation.ticket_type_name,
            ticket_type_charge: reservation.ticket_type_charge,
            ticket_cancel_charge: reservation.ticket_cancel_charge,
            ticket_ttts_extension: reservation.ticket_ttts_extension,
            charge: this.getChargeBySeatCode(seatCode),
            payment_no: this.paymentNo,
            purchaser_group: this.purchaserGroup,
            performance: this.performance._id,
            performance_day: this.performance.day,
            performance_open_time: this.performance.open_time,
            performance_start_time: this.performance.start_time,
            performance_end_time: this.performance.end_time,
            performance_ttts_extension: this.performance.ttts_extension,
            theater: this.performance.theater._id,
            theater_name: this.performance.theater.name,
            theater_address: this.performance.theater.address,
            screen: this.performance.screen._id,
            screen_name: this.performance.screen.name,
            film: this.performance.film._id,
            film_name: this.performance.film.name,
            film_image: this.performance.film.image,
            film_is_mx4d: this.performance.film.is_mx4d,
            film_copyright: this.performance.film.copyright,
            purchaser_last_name: (this.purchaser !== undefined) ? this.purchaser.lastName : '',
            purchaser_first_name: (this.purchaser !== undefined) ? this.purchaser.firstName : '',
            purchaser_email: (this.purchaser !== undefined) ? this.purchaser.email : '',
            purchaser_tel: (this.purchaser !== undefined) ? this.purchaser.tel : '',
            purchaser_age: (this.purchaser !== undefined) ? this.purchaser.age : '',
            purchaser_address: (this.purchaser !== undefined) ? this.purchaser.address : '',
            purchaser_gender: (this.purchaser !== undefined) ? this.purchaser.gender : '',
            payment_method: (this.paymentMethod !== undefined) ? this.paymentMethod : '',
            watcher_name: (reservation.watcher_name !== undefined) ? reservation.watcher_name : '',
            watcher_name_updated_at: (reservation.watcher_name !== undefined && reservation.watcher_name !== '') ? moment().valueOf() : '',
            purchased_at: this.purchasedAt
        };
        return new reservationRepo.reservationModel(doc);
    }
}
PlaceOrderTransactionSession.SESSION_KEY = 'ttts-reserve-session';
exports.default = PlaceOrderTransactionSession;
