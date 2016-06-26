export default class ReservationUtil {
    public static STATUS_AVAILABLE = 'AVAILABLE'; // 空席
    public static STATUS_TEMPORARY = 'TEMPORARY'; // 仮予約
    public static STATUS_RESERVED = 'RESERVED'; // 予約確定
    public static STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT'; // 決済待ち
    public static STATUS_WAITING_SETTLEMENT_WINDOW = 'WAITING_SETTLEMENT_WINDOW'; // 窓口清算待ち
    public static STATUS_KEPT_BY_TIFF = 'KEPT_BY_TIFF'; // 関係者席保留
}
