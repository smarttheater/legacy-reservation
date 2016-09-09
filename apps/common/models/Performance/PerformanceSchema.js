"use strict";
const mongoose = require('mongoose');
const PerformanceUtil_1 = require('./PerformanceUtil');
const moment = require('moment');
const ReservationSchema_1 = require('../Reservation/ReservationSchema');
/**
 * パフォーマンススキーマ
 */
let Schema = new mongoose.Schema({
    _id: String,
    theater: {
        type: String,
        ref: 'Theater'
    },
    theater_name: {
        ja: String,
        en: String,
    },
    screen: {
        type: String,
        ref: 'Screen'
    },
    screen_name: {
        ja: String,
        en: String,
    },
    film: {
        type: String,
        ref: 'Film'
    },
    day: String,
    open_time: String,
    start_time: String,
    end_time: String,
    canceled: Boolean // 上映中止フラグ 
}, {
    collection: 'performances',
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});
/** 開始文字列を表示形式で取得 */
Schema.virtual('start_str').get(function () {
    return `${this.day.substr(0, 4)}/${this.day.substr(4, 2)}/${this.day.substr(6)} ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)}`;
});
/**
 * 空席ステータスを算出する
 *
 * @param {string} reservationNumber 予約数
 */
Schema.methods.getSeatStatus = function (reservationNumber) {
    let availableSeatNum = this.screen.seats_number - reservationNumber;
    // 開始時間を20分過ぎていればG
    let now = parseInt(moment().add(20, 'minutes').format('YYYYMMDDHHmm'));
    if (parseInt(this.day + this.start_time) < now)
        return PerformanceUtil_1.default.SEAT_STATUS_G;
    // 残席0以下なら問答無用に×
    if (availableSeatNum <= 0)
        return PerformanceUtil_1.default.SEAT_STATUS_D;
    // 残席数よりステータスを算出
    let seatNum = 100 * availableSeatNum;
    if (PerformanceUtil_1.default.SEAT_STATUS_THRESHOLD_A * this.screen.seats_number < seatNum)
        return PerformanceUtil_1.default.SEAT_STATUS_A;
    if (PerformanceUtil_1.default.SEAT_STATUS_THRESHOLD_B * this.screen.seats_number < seatNum)
        return PerformanceUtil_1.default.SEAT_STATUS_B;
    if (PerformanceUtil_1.default.SEAT_STATUS_THRESHOLD_C * this.screen.seats_number < seatNum)
        return PerformanceUtil_1.default.SEAT_STATUS_C;
    return PerformanceUtil_1.default.SEAT_STATUS_D;
};
/**
 * パフォーマンスと予約の整合性を保つ
 */
Schema.post('findOneAndUpdate', function (doc, next) {
    mongoose.model('Reservation', ReservationSchema_1.default).update({
        performance: doc['_id']
    }, {
        performance_day: doc['day'],
        performance_open_time: doc['open_time'],
        performance_start_time: doc['start_time'],
        performance_end_time: doc['end_time'],
        performance_canceled: doc['canceled'],
    }, { multi: true }, (err, raw) => {
        console.log('reservation updated.', err, raw);
        next();
    });
});
Schema.index({
    day: 1,
    start_time: 1
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Schema;
