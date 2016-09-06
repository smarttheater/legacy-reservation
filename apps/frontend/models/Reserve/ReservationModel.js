"use strict";
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const GMOUtil_1 = require('../../../common/Util/GMO/GMOUtil');
const conf = require('config');
const moment = require('moment');
const redisClient_1 = require('../../../common/modules/redisClient');
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
     * @param {number} ttl 有効期間(default: 1800)
     */
    save(cb, ttl) {
        let key = ReservationModel.getRedisKey(this.token);
        let _ttl = (ttl) ? ttl : 1800;
        redisClient_1.default.setex(key, _ttl, JSON.stringify(this), (err) => {
            if (err)
                throw err;
            cb();
        });
    }
    /**
     * プロセス中の購入情報をセッションから削除する
     */
    remove(cb) {
        let key = ReservationModel.getRedisKey(this.token);
        redisClient_1.default.del(key, (err) => {
            cb(err);
        });
    }
    /**
     * プロセス中の購入情報をセッションから取得する
     */
    static find(token, cb) {
        let key = ReservationModel.getRedisKey(token);
        redisClient_1.default.get(key, (err, reply) => {
            if (err)
                return cb(err, null);
            if (reply === null)
                return cb(new Error('Not Found'), null);
            let reservationModel = new ReservationModel();
            try {
                let reservationModelInRedis = JSON.parse(reply.toString());
                for (let propertyName in reservationModelInRedis) {
                    reservationModel[propertyName] = reservationModelInRedis[propertyName];
                }
            }
            catch (error) {
                return cb(err, null);
            }
            cb(null, reservationModel);
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
     * フロー中の予約IDリストを取得する
     */
    getReservationIds() {
        return (this.seatCodes) ? this.seatCodes.map((seatCode) => { return this.getReservation(seatCode)._id; }) : [];
    }
    /**
     * 座席コードから予約(確定)ドキュメントを作成する
     */
    seatCode2reservationDocument(seatCode) {
        let reservation = this.getReservation(seatCode);
        let document = {
            _id: reservation._id,
            seat_code: seatCode,
            seat_grade_name_ja: reservation.seat_grade_name_ja,
            seat_grade_name_en: reservation.seat_grade_name_en,
            seat_grade_additional_charge: reservation.seat_grade_additional_charge,
            ticket_type_code: reservation.ticket_type_code,
            ticket_type_name_ja: reservation.ticket_type_name_ja,
            ticket_type_name_en: reservation.ticket_type_name_en,
            ticket_type_charge: reservation.ticket_type_charge,
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
            film_copyright: this.performance.film.copyright,
            purchaser_last_name: (this.purchaserLastName) ? this.purchaserLastName : '',
            purchaser_first_name: (this.purchaserFirstName) ? this.purchaserFirstName : '',
            purchaser_email: (this.purchaserEmail) ? this.purchaserEmail : '',
            purchaser_tel: (this.purchaserTel) ? this.purchaserTel : '',
            purchaser_age: (this.purchaserAge) ? this.purchaserAge : '',
            purchaser_address: (this.purchaserAddress) ? this.purchaserAddress : '',
            purchaser_gender: (this.purchaserGender) ? this.purchaserGender : '',
            payment_method: (this.paymentMethod) ? this.paymentMethod : '',
            watcher_name: (reservation.watcher_name) ? reservation.watcher_name : '',
            watcher_name_updated_at: (reservation.watcher_name) ? Date.now() : '',
            purchased_at: this.purchasedAt,
            gmo_shop_pass_string: (this.getTotalCharge() > 0) ? GMOUtil_1.default.createShopPassString(conf.get('gmo_payment_shop_id'), this.paymentNo, this.getTotalCharge().toString(), conf.get('gmo_payment_shop_password'), moment(this.purchasedAt).format('YYYYMMDDHHmmss')) : '',
            updated_user: 'ReservationModel'
        };
        return document;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationModel;
