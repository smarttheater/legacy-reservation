export default class PerformanceUtil {
    public static SEAT_STATUS_A = '◎';
    public static SEAT_STATUS_B = '○';
    public static SEAT_STATUS_C = '△';
    public static SEAT_STATUS_D = '×';
    public static SEAT_STATUS_G = '-';

    /**
     * パフォーマンスの残席ステータスを算出する
     *
     * @param {string} unavailableSeatNum 予約付加席数
     * @param {string} allSeatNum    スクリーン全席数
     * @param {string} start         上映開始時刻(YYYYMMDDhhmm)
     * @param {string} nowTime       現在時刻(YYYYMMDDhhmm)
     * 
     * @return string
     */
    public static seatNum2status(unavailableSeatNum: number, allSeatNum: number, start: number, now: number) {
        let availableSeatNum = allSeatNum - unavailableSeatNum;

        // 開始時間を過ぎていればG
        if (start < now) return PerformanceUtil.SEAT_STATUS_G;

        // 残席0以下なら問答無用に×
        if (availableSeatNum <= 0) return PerformanceUtil.SEAT_STATUS_D;

        // 残席数よりステータスを算出
        let seatNum = 100 * availableSeatNum;
        if (99 * allSeatNum <= seatNum) return PerformanceUtil.SEAT_STATUS_A;
        if (90 * allSeatNum <= seatNum) return PerformanceUtil.SEAT_STATUS_B;
        if (0 * allSeatNum < seatNum) return PerformanceUtil.SEAT_STATUS_C;

        return PerformanceUtil.SEAT_STATUS_D;
    }
}
