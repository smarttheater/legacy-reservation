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
const gmo_service_1 = require("@motionpicture/gmo-service");
const conf = require("config");
const moment = require("moment");
const redis = require("redis");
const DEFAULT_REDIS_TTL = 1800;
const redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST, {
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST },
    return_buffers: true
});
const MAX_RESERVATION_SEATS_DEFAULT = 4;
const MAX_RESERVATION_SEATS_STAFFS = 10;
const MAX_RESERVATION_SEATS_LIMITED_PERFORMANCES = 10;
/**
 * 予約情報モデル
 *
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 *
 * @export
 * @class ReserveSessionModel
 */
class ReserveSessionModel {
    /**
     * プロセス中の購入情報をセッションから取得する
     */
    // tslint:disable-next-line:function-name
    static find(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = ReserveSessionModel.getRedisKey(token);
            return new Promise((resolve, reject) => {
                redisClient.get(key, (err, reply) => {
                    if (err instanceof Error) {
                        reject(err);
                        return;
                    }
                    if (reply === null) {
                        resolve(null);
                        return;
                    }
                    const reservationModel = new ReserveSessionModel();
                    try {
                        const reservationModelInRedis = JSON.parse(reply.toString());
                        Object.keys(reservationModelInRedis).forEach((propertyName) => {
                            reservationModel[propertyName] = reservationModelInRedis[propertyName];
                        });
                    }
                    catch (error) {
                        reject(error);
                        return;
                    }
                    resolve(reservationModel);
                });
            });
        });
    }
    /**
     * ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    static getRedisKey(token) {
        return `CHEVREReservation_${token}`;
    }
    /**
     * プロセス中の購入情報をセッションに保存する
     *
     * @param {number} [ttl] 有効期間(default: 1800)
     */
    save(ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = ReserveSessionModel.getRedisKey(this.token);
            if (ttl === undefined) {
                ttl = DEFAULT_REDIS_TTL;
            }
            return new Promise((resolve, reject) => {
                redisClient.setex(key, ttl, JSON.stringify(this), (err) => {
                    if (err instanceof Error) {
                        console.error(err);
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    /**
     * プロセス中の購入情報をセッションから削除する
     */
    remove() {
        return __awaiter(this, void 0, void 0, function* () {
            const key = ReserveSessionModel.getRedisKey(this.token);
            return new Promise((resolve, reject) => {
                redisClient.del(key, (err) => {
                    if (err instanceof Error) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    /**
     * 一度の購入で予約できる座席数を取得する
     */
    getSeatsLimit() {
        let limit = MAX_RESERVATION_SEATS_DEFAULT;
        // 主体によっては、決済方法を強制的に固定で
        switch (this.purchaserGroup) {
            case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
            case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW:
                limit = MAX_RESERVATION_SEATS_STAFFS;
                break;
            case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                if (this.performance !== undefined) {
                    // 制限枚数指定のパフォーマンスの場合
                    const performanceIds4limit2 = conf.get('performanceIds4limit2');
                    if (performanceIds4limit2.indexOf(this.performance._id) >= 0) {
                        limit = MAX_RESERVATION_SEATS_LIMITED_PERFORMANCES;
                    }
                }
                break;
            default:
                break;
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
        if (this.purchaserGroup === chevre_domain_1.ReservationUtil.PURCHASER_GROUP_CUSTOMER
            || this.purchaserGroup === chevre_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW) {
            const reservation = this.getReservation(seatCode);
            // 座席グレード分加算
            if (reservation.seat_grade_additional_charge > 0) {
                charge += reservation.seat_grade_additional_charge;
            }
            // MX4D分加算
            if (this.performance.film.is_mx4d) {
                charge += chevre_domain_1.ReservationUtil.CHARGE_MX4D;
            }
            // コンビニ手数料加算
            if (this.paymentMethod === gmo_service_1.Util.PAY_TYPE_CVS) {
                charge += chevre_domain_1.ReservationUtil.CHARGE_CVS;
            }
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
     * フロー中の予約IDリストを取得する
     */
    getReservationIds() {
        return (this.seatCodes !== undefined) ? this.seatCodes.map((seatCode) => this.getReservation(seatCode)._id) : [];
    }
    /**
     * 座席コードから予約(確定)ドキュメントを作成する
     *
     * @param {string} seatCode 座席コード
     */
    seatCode2reservationDocument(seatCode) {
        const reservation = this.getReservation(seatCode);
        return {
            _id: reservation._id,
            status: reservation.status,
            seat_code: seatCode,
            seat_grade_name: reservation.seat_grade_name,
            seat_grade_additional_charge: reservation.seat_grade_additional_charge,
            ticket_type: reservation.ticket_type,
            ticket_type_name: reservation.ticket_type_name,
            ticket_type_charge: reservation.ticket_type_charge,
            charge: this.getChargeBySeatCode(seatCode),
            payment_no: this.paymentNo,
            purchaser_group: this.purchaserGroup,
            performance: this.performance._id,
            performance_day: this.performance.day,
            performance_open_time: this.performance.open_time,
            performance_start_time: this.performance.start_time,
            performance_end_time: this.performance.end_time,
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
            purchaser_last_name: (this.purchaserLastName !== undefined) ? this.purchaserLastName : '',
            purchaser_first_name: (this.purchaserFirstName !== undefined) ? this.purchaserFirstName : '',
            purchaser_email: (this.purchaserEmail !== undefined) ? this.purchaserEmail : '',
            purchaser_tel: (this.purchaserTel !== undefined) ? this.purchaserTel : '',
            purchaser_age: (this.purchaserAge !== undefined) ? this.purchaserAge : '',
            purchaser_address: (this.purchaserAddress !== undefined) ? this.purchaserAddress : '',
            purchaser_gender: (this.purchaserGender !== undefined) ? this.purchaserGender : '',
            payment_method: (this.paymentMethod !== undefined) ? this.paymentMethod : '',
            watcher_name: (reservation.watcher_name !== undefined) ? reservation.watcher_name : '',
            watcher_name_updated_at: (reservation.watcher_name !== undefined) ? moment().valueOf() : '',
            purchased_at: this.purchasedAt,
            updated_user: 'ReserveSessionModel'
        };
    }
}
exports.default = ReserveSessionModel;
