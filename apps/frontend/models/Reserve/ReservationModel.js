"use strict";
const Util_1 = require('../../../common/Util/Util');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
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
        let _ttl = (ttl) ? ttl : 3600;
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
            // 座席グレード分加算
            if (reservation.seat_grade_additional_charge > 0) {
                charge += reservation.seat_grade_additional_charge;
            }
            // MX4D分加算
            if (this.performance.is_mx4d) {
                charge += ReservationUtil_1.default.CHARGE_MX4D;
            }
        }
        return charge;
    }
    getChargeExceptTicketTypeBySeatCode(seatCode) {
        let charge = 0;
        if (this.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER
            || this.purchaserGroup === ReservationUtil_1.default.PURCHASER_GROUP_WINDOW) {
            let reservation = this.getReservation(seatCode);
            // 座席グレード分加算
            if (reservation.seat_grade_additional_charge > 0) {
                charge += reservation.seat_grade_additional_charge;
            }
            // MX4D分加算
            if (this.performance.is_mx4d) {
                charge += ReservationUtil_1.default.CHARGE_MX4D;
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
                seat_grade_name: reservation.seat_grade_name,
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
                performance_is_mx4d: this.performance.is_mx4d,
                theater: this.performance.theater._id,
                theater_name: this.performance.theater.name,
                theater_name_en: this.performance.theater.name_en,
                screen: this.performance.screen._id,
                screen_name: this.performance.screen.name,
                screen_name_en: this.performance.screen.name_en,
                film: this.performance.film._id,
                film_name: this.performance.film.name,
                film_name_en: this.performance.film.name_en,
                purchaser_last_name: (this.profile) ? this.profile.last_name : null,
                purchaser_first_name: (this.profile) ? this.profile.first_name : null,
                purchaser_email: (this.profile) ? this.profile.email : null,
                purchaser_tel: (this.profile) ? this.profile.tel : null,
                payment_method: (this.paymentMethod) ? this.paymentMethod : null,
                ticket_type_code: reservation.ticket_type_code,
                ticket_type_name: reservation.ticket_type_name,
                ticket_type_name_en: reservation.ticket_type_name_en,
                ticket_type_charge: reservation.ticket_type_charge,
                watcher_name: reservation.watcher_name,
                watcher_name_updated_at: Date.now(),
                // member: (this.member) ? this.member._id : null,
                // member_user_id: (this.member) ? this.member.user_id : null,
                updated_user: 'ReservationModel'
            });
        });
        return documents;
    }
    /**
     * ログ用の形式にする
     */
    toLog() {
        let log = {
            token: this.token,
            paymentNo: this.paymentNo,
            performance: this.performance,
            seatCodes: this.seatCodes,
            profile: this.profile,
            paymentMethod: this.paymentMethod,
            purchaserGroup: this.purchaserGroup
        };
        return log;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationModel;
