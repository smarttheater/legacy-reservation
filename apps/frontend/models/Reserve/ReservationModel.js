"use strict";
const Util_1 = require('../../../common/Util/Util');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const GMOUtil_1 = require('../../../common/Util/GMO/GMOUtil');
/**
 * 予約情報モデル
 *
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 */
class ReservationModel {
    /**
     * プロセス中の購入情報をセッションに保存する
     *
     * @param {number} ttl 有効期間(default: 3600)
     */
    save(cb, ttl) {
        let client = Util_1.default.getRedisClient();
        let key = ReservationModel.getRedisKey(this.token);
        let _ttl = (ttl) ? ttl : 1800; // 30分有効 TODO 調整(仮押さえが削除される時間より長めにとること)
        client.setex(key, _ttl, JSON.stringify(this), (err, reply) => {
            client.quit();
            cb(err);
        });
    }
    /**
     * プロセス中の購入情報をセッションから削除する
     */
    remove(cb) {
        let client = Util_1.default.getRedisClient();
        let key = ReservationModel.getRedisKey(this.token);
        client.del(key, (err, reply) => {
            client.quit();
            cb(err);
        });
    }
    /**
     * プロセス中の購入情報をセッションから取得する
     */
    static find(token, cb) {
        let client = Util_1.default.getRedisClient();
        let key = ReservationModel.getRedisKey(token);
        client.get(key, (err, reply) => {
            client.quit();
            if (err) {
                cb(err, null);
            }
            else {
                if (reply === null) {
                    cb(new Error('Not Found'), null);
                }
                else {
                    let reservationModel = new ReservationModel();
                    let reservationModelInRedis = JSON.parse(reply.toString('utf-8'));
                    for (let propertyName in reservationModelInRedis) {
                        reservationModel[propertyName] = reservationModelInRedis[propertyName];
                    }
                    cb(err, reservationModel);
                }
            }
        });
    }
    /**
     * ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    static getRedisKey(token) {
        return `TIFFReservation_${token}`;
    }
    /**
     * 合計金額を算出する
     */
    getTotalCharge() {
        let total = 0;
        if (Array.isArray(this.seatCodes) && this.seatCodes.length > 0) {
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
        let reservation = this.getReservation(seatCode);
        if (reservation.ticket_type_charge) {
            charge += reservation.ticket_type_charge;
            charge += this.getChargeExceptTicketTypeBySeatCode(seatCode);
        }
        return charge;
    }
    getChargeExceptTicketTypeBySeatCode(seatCode) {
        let charge = 0;
        if (this.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER
            || this.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_WINDOW
            || this.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_TEL) {
            let reservation = this.getReservation(seatCode);
            // 座席グレード分加算
            if (reservation.seat_grade_additional_charge > 0) {
                charge += reservation.seat_grade_additional_charge;
            }
            // MX4D分加算
            if (this.performance.film.is_mx4d) {
                charge += ReservationUtil_1.default.CHARGE_MX4D;
            }
            // コンビニ手数料加算
            if (this.paymentMethod === GMOUtil_1.default.PAY_TYPE_CVS) {
                charge += ReservationUtil_1.default.CHARGE_CVS;
            }
        }
        return charge;
    }
    /**
     * 座席コードから予約情報を取得する
     */
    getReservation(seatCode) {
        return (this[`reservation_${seatCode}`]) ? this[`reservation_${seatCode}`] : null;
    }
    /**
     * 座席コードの予約情報をセットする
     */
    setReservation(seatCode, reservation) {
        this[`reservation_${seatCode}`] = reservation;
    }
    /**
     * 予約ドキュメントへ変換
     */
    toReservationDocuments() {
        let documents = [];
        let totalCharge = this.getTotalCharge();
        this.seatCodes.forEach((seatCode) => {
            let reservation = this.getReservation(seatCode);
            documents.push({
                // TODO 金額系の税込みと消費税と両方
                _id: reservation._id,
                seat_code: seatCode,
                seat_grade_name_ja: reservation.seat_grade_name_ja,
                seat_grade_name_en: reservation.seat_grade_name_en,
                seat_grade_additional_charge: reservation.seat_grade_additional_charge,
                total_charge: totalCharge,
                charge: this.getChargeBySeatCode(seatCode),
                payment_no: this.paymentNo,
                purchaser_group: this.purchaserGroup,
                performance: this.performance._id,
                performance_day: this.performance.day,
                performance_start_time: this.performance.start_time,
                performance_end_time: this.performance.end_time,
                theater: this.performance.theater._id,
                theater_name_ja: this.performance.theater.name.ja,
                theater_name_en: this.performance.theater.name.en,
                screen: this.performance.screen._id,
                screen_name_ja: this.performance.screen.name.ja,
                screen_name_en: this.performance.screen.name.en,
                film: this.performance.film._id,
                film_name_ja: this.performance.film.name.ja,
                film_name_en: this.performance.film.name.en,
                film_image: this.performance.film.image,
                film_is_mx4d: this.performance.film.is_mx4d,
                purchaser_last_name: (this.purchaserLastName) ? this.purchaserLastName : undefined,
                purchaser_first_name: (this.purchaserFirstName) ? this.purchaserFirstName : undefined,
                purchaser_email: (this.purchaserEmail) ? this.purchaserEmail : undefined,
                purchaser_tel: (this.purchaserTel) ? this.purchaserTel : undefined,
                payment_method: (this.paymentMethod) ? this.paymentMethod : undefined,
                ticket_type_code: reservation.ticket_type_code,
                ticket_type_name_ja: reservation.ticket_type_name_ja,
                ticket_type_name_en: reservation.ticket_type_name_en,
                ticket_type_charge: reservation.ticket_type_charge,
                watcher_name: (reservation.watcher_name) ? reservation.watcher_name : undefined,
                watcher_name_updated_at: (reservation.watcher_name) ? Date.now() : undefined,
                updated_user: 'ReservationModel'
            });
        });
        return documents;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationModel;
