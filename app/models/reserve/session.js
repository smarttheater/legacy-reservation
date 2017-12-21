"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const moment = require("moment");
/**
 * 予約セッション
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 * @export
 * @class ReserveSessionModel
 */
class ReserveSessionModel {
    constructor(transactionInProgress) {
        this.transactionInProgress = transactionInProgress;
    }
    /**
     * プロセス中の購入情報をセッションから取得する
     */
    static FIND(req) {
        const transactionInProgress = req.session.transactionInProgress;
        if (transactionInProgress === undefined) {
            return null;
        }
        return new ReserveSessionModel(transactionInProgress);
    }
    /**
     * プロセス中の購入情報をセッションから削除する
     */
    static REMOVE(req) {
        delete req.session.transactionInProgress;
    }
    /**
     * プロセス中の購入情報をセッションに保存する
     */
    save(req) {
        req.session.transactionInProgress = this.transactionInProgress;
    }
    /**
     * 合計金額を算出する
     */
    getTotalCharge() {
        let total = 0;
        if (Array.isArray(this.transactionInProgress.reservations)) {
            this.transactionInProgress.reservations.forEach((reservation) => {
                total += this.getChargeBySeatCode(reservation.seat_code);
            });
        }
        return total;
    }
    /**
     * 座席単体の料金を算出する
     */
    getChargeBySeatCode(seatCode) {
        let charge = 0;
        const reservation = this.transactionInProgress.reservations.find((r) => r.seat_code === seatCode);
        if (reservation !== undefined && reservation.ticket_type_charge !== undefined) {
            charge += reservation.ticket_type_charge;
            charge += this.getChargeExceptTicketTypeBySeatCode(seatCode);
        }
        return charge;
    }
    getChargeExceptTicketTypeBySeatCode(seatCode) {
        let charge = 0;
        const reservation = this.transactionInProgress.reservations.find((r) => r.seat_code === seatCode);
        // 座席グレード分加算
        if (reservation !== undefined) {
            if (reservation.seat_grade_additional_charge > 0) {
                charge += reservation.seat_grade_additional_charge;
            }
        }
        return charge;
    }
    /**
     * 座席コードから予約(確定)ドキュメントを作成する
     * @param {string} seatCode 座席コード
     */
    seatCode2reservationDocument(seatCode) {
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservation = this.transactionInProgress.reservations.find((r) => r.seat_code === seatCode);
        if (reservation === undefined) {
            return new reservationRepo.reservationModel();
        }
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
            payment_no: this.transactionInProgress.paymentNo,
            purchaser_group: this.transactionInProgress.purchaserGroup,
            performance: this.transactionInProgress.performance.id,
            performance_day: this.transactionInProgress.performance.day,
            performance_open_time: this.transactionInProgress.performance.open_time,
            performance_start_time: this.transactionInProgress.performance.start_time,
            performance_end_time: this.transactionInProgress.performance.end_time,
            performance_ttts_extension: this.transactionInProgress.performance.ttts_extension,
            theater: this.transactionInProgress.performance.theater.id,
            theater_name: this.transactionInProgress.performance.theater.name,
            theater_address: this.transactionInProgress.performance.theater.address,
            screen: this.transactionInProgress.performance.screen.id,
            screen_name: this.transactionInProgress.performance.screen.name,
            film: this.transactionInProgress.performance.film.id,
            film_name: this.transactionInProgress.performance.film.name,
            film_image: this.transactionInProgress.performance.film.image,
            film_is_mx4d: this.transactionInProgress.performance.film.is_mx4d,
            film_copyright: this.transactionInProgress.performance.film.copyright,
            purchaser_last_name: (this.transactionInProgress.purchaser !== undefined) ? this.transactionInProgress.purchaser.lastName : '',
            purchaser_first_name: (this.transactionInProgress.purchaser !== undefined) ? this.transactionInProgress.purchaser.firstName : '',
            purchaser_email: (this.transactionInProgress.purchaser !== undefined) ? this.transactionInProgress.purchaser.email : '',
            purchaser_tel: (this.transactionInProgress.purchaser !== undefined) ? this.transactionInProgress.purchaser.tel : '',
            purchaser_age: (this.transactionInProgress.purchaser !== undefined) ? this.transactionInProgress.purchaser.age : '',
            purchaser_address: (this.transactionInProgress.purchaser !== undefined) ? this.transactionInProgress.purchaser.address : '',
            purchaser_gender: (this.transactionInProgress.purchaser !== undefined) ? this.transactionInProgress.purchaser.gender : '',
            payment_method: (this.transactionInProgress.paymentMethod !== undefined) ? this.transactionInProgress.paymentMethod : '',
            watcher_name: (reservation.watcher_name !== undefined) ? reservation.watcher_name : '',
            watcher_name_updated_at: (reservation.watcher_name !== undefined && reservation.watcher_name !== '') ? moment().valueOf() : '',
            purchased_at: this.transactionInProgress.purchasedAt
        };
        return new reservationRepo.reservationModel(doc);
    }
}
exports.default = ReserveSessionModel;
