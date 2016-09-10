import mongoose = require('mongoose');
import PerformanceUtil from './PerformanceUtil';
import moment = require('moment')

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
    day: String, // 上映日
    open_time: String, // 開演時刻
    start_time: String, // 上映開始時刻
    end_time: String, // 上映終了時刻
    canceled: Boolean // 上映中止フラグ 
},{
    collection: 'performances',
    timestamps: { 
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
});

/** 開始文字列を表示形式で取得 */
Schema.virtual('start_str').get(function() {
    return `${this.day.substr(0, 4)}/${this.day.substr(4, 2)}/${this.day.substr(6)} ${this.start_time.substr(0, 2)}:${this.start_time.substr(2)}`;
});

/**
 * 空席ステータスを算出する
 * 
 * @param {string} reservationNumber 予約数
 */
Schema.methods.getSeatStatus = function(reservationNumber: number) {
    let availableSeatNum = this.screen.seats_number - reservationNumber;

    // 開始時間を20分過ぎていればG
    let now = parseInt(moment().add(20, 'minutes').format('YYYYMMDDHHmm'));
    if (parseInt(this.day + this.start_time) < now) return PerformanceUtil.SEAT_STATUS_G;

    // 残席0以下なら問答無用に×
    if (availableSeatNum <= 0) return PerformanceUtil.SEAT_STATUS_D;

    // 残席数よりステータスを算出
    let seatNum = 100 * availableSeatNum;
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_A * this.screen.seats_number < seatNum) return PerformanceUtil.SEAT_STATUS_A;
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_B * this.screen.seats_number < seatNum) return PerformanceUtil.SEAT_STATUS_B;
    if (PerformanceUtil.SEAT_STATUS_THRESHOLD_C * this.screen.seats_number < seatNum) return PerformanceUtil.SEAT_STATUS_C;

    return PerformanceUtil.SEAT_STATUS_D;
};

Schema.index(
    {
        day: 1,
        start_time: 1
    }
);

export default Schema;