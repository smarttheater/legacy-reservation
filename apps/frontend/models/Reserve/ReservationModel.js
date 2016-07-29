"use strict";
var ReservationResultModel_1 = require('./ReservationResultModel');
var Util_1 = require('../../../common/Util/Util');
var ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
/**
 * 予約情報モデル
 *
 * 予約プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、予約プロセスを管理しています
 */
var ReservationModel = (function () {
    function ReservationModel() {
    }
    /**
     * プロセス中の購入情報をセッションに保存する
     *
     * @param {number} ttl 有効期間(default: 3600)
     */
    ReservationModel.prototype.save = function (cb, ttl) {
        var client = Util_1.default.getRedisClient();
        var key = ReservationModel.getRedisKey(this.token);
        var _ttl = (ttl) ? ttl : 3600;
        client.setex(key, _ttl, JSON.stringify(this), function (err, reply) {
            client.quit();
            cb(err);
        });
    };
    /**
     * プロセス中の購入情報をセッションから削除する
     */
    ReservationModel.prototype.remove = function (cb) {
        var client = Util_1.default.getRedisClient();
        var key = ReservationModel.getRedisKey(this.token);
        client.del(key, function (err, reply) {
            client.quit();
            cb(err);
        });
    };
    /**
     * プロセス中の購入情報をセッションから取得する
     */
    ReservationModel.find = function (token, cb) {
        var client = Util_1.default.getRedisClient();
        var key = ReservationModel.getRedisKey(token);
        client.get(key, function (err, reply) {
            client.quit();
            if (err) {
                cb(err, null);
            }
            else {
                if (reply === null) {
                    cb(err, null);
                }
                else {
                    var reservationModel = new ReservationModel();
                    var reservationModelInRedis = JSON.parse(reply.toString('utf-8'));
                    for (var propertyName in reservationModelInRedis) {
                        reservationModel[propertyName] = reservationModelInRedis[propertyName];
                    }
                    cb(err, reservationModel);
                }
            }
        });
    };
    /**
     * ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    ReservationModel.getRedisKey = function (token) {
        return "TIFFReservation_" + token;
    };
    /**
     * 合計金額を算出する
     */
    ReservationModel.prototype.getTotalPrice = function () {
        var _this = this;
        var total = 0;
        if (Array.isArray(this.reservationIds) && this.reservationIds.length > 0) {
            this.reservationIds.forEach(function (reservationId, index) {
                var reservation = _this.getReservation(reservationId);
                if (reservation.ticket_type_charge) {
                    total += reservation.ticket_type_charge;
                    // 座席グレード分加算
                    if (reservation.seat_grade_additional_charge > 0) {
                        total += reservation.seat_grade_additional_charge;
                    }
                    // MX4D分加算
                    if (_this.performance.is_mx4d) {
                        total += 200;
                    }
                }
            });
        }
        return total;
    };
    /**
     * 仮予約中の座席コードリストを取得する
     */
    ReservationModel.prototype.getSeatCodes = function () {
        var _this = this;
        var seatcodes = [];
        if (Array.isArray(this.reservationIds) && this.reservationIds.length > 0) {
            this.reservationIds.forEach(function (reservationId, index) {
                var reservation = _this.getReservation(reservationId);
                seatcodes.push(reservation.seat_code);
            });
        }
        return seatcodes;
    };
    ReservationModel.prototype.getReservation = function (id) {
        return (this[("reservation_" + id)]) ? this[("reservation_" + id)] : null;
    };
    ReservationModel.prototype.setReservation = function (id, reservation) {
        this[("reservation_" + id)] = reservation;
    };
    /**
     * 予約ドキュメントへ変換
     */
    ReservationModel.prototype.toReservationDocuments = function () {
        var _this = this;
        var documents = [];
        this.reservationIds.forEach(function (reservationId, index) {
            var reservation = _this.getReservation(reservationId);
            documents.push({
                payment_no: _this.paymentNo,
                status: ReservationUtil_1.default.STATUS_RESERVED,
                performance: _this.performance._id,
                performance_day: _this.performance.day,
                performance_start_time: _this.performance.start_time,
                performance_end_time: _this.performance.end_time,
                theater: _this.performance.theater._id,
                theater_name: _this.performance.theater.name,
                screen: _this.performance.screen._id,
                screen_name: _this.performance.screen.name,
                film: _this.performance.film._id,
                film_name: _this.performance.film.name,
                purchaser_last_name: _this.profile.last_name,
                purchaser_first_name: _this.profile.first_name,
                purchaser_email: _this.profile.email,
                purchaser_tel: _this.profile.tel,
                ticket_type_code: reservation.ticket_type_code,
                ticket_type_name: reservation.ticket_type_name,
                ticket_type_name_en: reservation.ticket_type_name_en,
                ticket_type_charge: reservation.ticket_type_charge,
                watcher_name: reservation.watcher_name,
                member: (_this.member) ? _this.member._id : null,
                member_user_id: (_this.member) ? _this.member.user_id : null,
                sponsor: (_this.sponsor) ? _this.sponsor._id : null,
                sponsor_user_id: (_this.sponsor) ? _this.sponsor.user_id : null,
                sponsor_name: (_this.sponsor) ? _this.sponsor.name : null,
                sponsor_email: (_this.sponsor) ? _this.sponsor.email : null,
                staff: (_this.staff) ? _this.staff._id : null,
                staff_user_id: (_this.staff) ? _this.staff.user_id : null,
                staff_name: (_this.staff) ? _this.staff.name : null,
                staff_email: (_this.staff) ? _this.staff.email : null,
                staff_department_name: (_this.staff) ? _this.staff.department_name : null,
                staff_tel: (_this.staff) ? _this.staff.tel : null,
                staff_signature: (_this.staff) ? _this.staff.signature : null,
                created_user: _this.constructor.toString(),
                updated_user: _this.constructor.toString(),
            });
        });
        return documents;
    };
    /**
     * 予約結果モデルへ変換
     */
    ReservationModel.prototype.toReservationResult = function () {
        var _this = this;
        var reservationResultModel = new ReservationResultModel_1.default();
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
        this.reservationIds.forEach(function (reservationId, index) {
            reservationResultModel.reservations.push(_this.getReservation(reservationId));
        });
        return reservationResultModel;
    };
    /**
     * ログ用の形式にする
     */
    ReservationModel.prototype.toLog = function () {
        var log = {
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
    };
    return ReservationModel;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationModel;
