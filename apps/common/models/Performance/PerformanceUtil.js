"use strict";
var PerformanceUtil = (function () {
    function PerformanceUtil() {
    }
    /**
     * パフォーマンスの残席ステータスを算出する
     *
     * @param {string} availableSeatNum 残席数
     * @param {string} allSeatNum    スクリーン全席数
     * @param {string} start         上映開始時刻(YYYYMMDDhhmm)
     * @param {string} nowTime       TOHO的現在時刻(YYYYMMDDhhmm)
     *
     * @return string
     */
    PerformanceUtil.seatNum2status = function (availableSeatNum, allSeatNum, start, now) {
        // 開始時間を過ぎていればG
        if (start < now)
            return PerformanceUtil.SEAT_STATUS_G;
        // 残席0以下なら問答無用に×
        if (availableSeatNum <= 0)
            return PerformanceUtil.SEAT_STATUS_D;
        // 残席数よりステータスを算出
        var seatNum = 100 * availableSeatNum;
        if (99 * allSeatNum <= seatNum)
            return PerformanceUtil.SEAT_STATUS_A;
        if (90 * allSeatNum <= seatNum)
            return PerformanceUtil.SEAT_STATUS_B;
        if (0 * allSeatNum < seatNum)
            return PerformanceUtil.SEAT_STATUS_C;
        return PerformanceUtil.SEAT_STATUS_D;
    };
    PerformanceUtil.SEAT_STATUS_A = '◎';
    PerformanceUtil.SEAT_STATUS_B = '○';
    PerformanceUtil.SEAT_STATUS_C = '△';
    PerformanceUtil.SEAT_STATUS_D = '×';
    PerformanceUtil.SEAT_STATUS_G = '-';
    return PerformanceUtil;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceUtil;
