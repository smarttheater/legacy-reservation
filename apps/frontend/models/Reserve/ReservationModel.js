"use strict";
const ReservationResultModel_1 = require('./ReservationResultModel');
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
                    cb(err, null);
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
        if (Array.isArray(this.reservationIds) && this.reservationIds.length > 0) {
            this.reservationIds.forEach((reservationId) => {
                total += this.getChargeByReservationId(reservationId);
            });
        }
        return total;
    }
    /**
     * 座席単体の料金を算出する
     */
    getChargeByReservationId(reservationId) {
        let charge = 0;
        let reservation = this.getReservation(reservationId);
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
    /**
     * 仮予約中の座席コードリストを取得する
     */
    getSeatCodes() {
        let seatcodes = [];
        if (Array.isArray(this.reservationIds) && this.reservationIds.length > 0) {
            this.reservationIds.forEach((reservationId, index) => {
                let reservation = this.getReservation(reservationId);
                seatcodes.push(reservation.seat_code);
            });
        }
        return seatcodes;
    }
    getReservation(id) {
        return (this[`reservation_${id}`]) ? this[`reservation_${id}`] : null;
    }
    setReservation(id, reservation) {
        this[`reservation_${id}`] = reservation;
    }
    /**
     * 予約ドキュメントへ変換
     */
    toReservationDocuments() {
        let documents = [];
        let totalCharge = this.getTotalCharge();
        // 購入者区分
        let purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER;
        if (this.member) {
            purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_MEMBER;
        }
        else if (this.sponsor) {
            purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_SPONROR;
        }
        else if (this.staff) {
            purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_STAFF;
        }
        this.reservationIds.forEach((reservationId, index) => {
            let reservation = this.getReservation(reservationId);
            documents.push({
                // TODO 配布先更新日を追加
                // TODO 金額系の税込みと消費税と両方
                // TODO 決済方法(現金、クレジット、コンビニ、、、)
                _id: reservationId,
                total_charge: totalCharge,
                charge: this.getChargeByReservationId(reservationId),
                payment_no: this.paymentNo,
                purchaser_group: purchaserGroup,
                performance: this.performance._id,
                performance_day: this.performance.day,
                performance_start_time: this.performance.start_time,
                performance_end_time: this.performance.end_time,
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
                ticket_type_code: reservation.ticket_type_code,
                ticket_type_name: reservation.ticket_type_name,
                ticket_type_name_en: reservation.ticket_type_name_en,
                ticket_type_charge: reservation.ticket_type_charge,
                watcher_name: reservation.watcher_name,
                mvtk_kiin_cd: (this.mvtkMemberInfoResult) ? this.mvtkMemberInfoResult.kiinCd : null,
                member: (this.member) ? this.member._id : null,
                member_user_id: (this.member) ? this.member.user_id : null,
                sponsor: (this.sponsor) ? this.sponsor._id : null,
                sponsor_user_id: (this.sponsor) ? this.sponsor.user_id : null,
                sponsor_name: (this.sponsor) ? this.sponsor.name : null,
                sponsor_email: (this.sponsor) ? this.sponsor.email : null,
                staff: (this.staff) ? this.staff._id : null,
                staff_user_id: (this.staff) ? this.staff.user_id : null,
                staff_name: (this.staff) ? this.staff.name : null,
                staff_email: (this.staff) ? this.staff.email : null,
                staff_department_name: (this.staff) ? this.staff.department_name : null,
                staff_tel: (this.staff) ? this.staff.tel : null,
                staff_signature: (this.staff) ? this.staff.signature : null,
                updated_user: 'ReservationModel'
            });
        });
        return documents;
    }
    /**
     * 予約結果モデルへ変換
     */
    toReservationResult() {
        let reservationResultModel = new ReservationResultModel_1.default();
        reservationResultModel.token = this.token;
        reservationResultModel.paymentNo = this.paymentNo;
        reservationResultModel.performance = this.performance;
        reservationResultModel.reservations = [];
        reservationResultModel.profile = this.profile;
        reservationResultModel.paymentMethod = this.paymentMethod;
        reservationResultModel.member = this.member;
        reservationResultModel.staff = this.staff;
        reservationResultModel.sponsor = this.sponsor;
        reservationResultModel.reservedDocuments = this.reservedDocuments;
        this.reservationIds.forEach((reservationId, index) => {
            reservationResultModel.reservations.push(this.getReservation(reservationId));
        });
        return reservationResultModel;
    }
    /**
     * ログ用の形式にする
     */
    toLog() {
        let log = {
            token: this.token,
            paymentNo: this.paymentNo,
            performance: this.performance,
            reservationIds: this.reservationIds,
            profile: this.profile,
            paymentMethod: this.paymentMethod,
            member: this.member,
            staff: this.staff,
            sponsor: this.sponsor,
            reservedDocuments: this.reservedDocuments,
        };
        return log;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationModel;
