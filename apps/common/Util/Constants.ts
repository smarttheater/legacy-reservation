/**
 * 定数クラス
 */
export default class Constants {
    /** メルマガ先行予約開始日時 */
    public static MEMBER_RESERVATION_START_DATETIME = '2016-10-22T00:00:00+09:00';
    /** メルマガ先行予約終了日時 */
    public static MEMBER_RESERVATION_END_DATETIME = '2016-10-24T23:59:59+09:00';

    // TODO 日時確定
    /** コンビニ決済終了日時 */
    public static CVS_RESERVATION_END_DATETIME = '2016-10-18T23:59:59+09:00';

    // TODO 調整
    /** 仮予約有効期間(秒) */
    public static TEMPORARY_RESERVATION_VALID_PERIOD_SECONDS = 1800;
};
