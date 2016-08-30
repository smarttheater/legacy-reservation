import qr = require('qr-image');

export default class ReservationUtil {
    /** 仮予約 */
    public static STATUS_TEMPORARY = 'TEMPORARY';
    /** TIFF確保上の仮予約 */
    public static STATUS_TEMPORARY_ON_KEPT_BY_TIFF = 'TEMPORARY_ON_KEPT_BY_TIFF';
    /** 決済待ち */
    public static STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT';
    /**  ペイデザイン決済待ち */
    public static STATUS_WAITING_SETTLEMENT_PAY_DESIGN = 'WAITING_SETTLEMENT_PAY_DESIGN';
    /** TIFF確保 */
    public static STATUS_KEPT_BY_TIFF = 'KEPT_BY_TIFF';
    /** メルマガ会員保留 */
    public static STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER';
    /** 予約確定 */
    public static STATUS_RESERVED = 'RESERVED';

    /** 一般 */
    public static PURCHASER_GROUP_CUSTOMER = '01'; 
    /** メルマガ会員先行 */
    public static PURCHASER_GROUP_MEMBER = '02';
    /** 外部関係者 */
    public static PURCHASER_GROUP_SPONSOR = '03';
    /** 内部関係者 */
    public static PURCHASER_GROUP_STAFF = '04';
    /** 電話 */
    public static PURCHASER_GROUP_TEL = '05';
    /** 窓口 */
    public static PURCHASER_GROUP_WINDOW = '06';

    public static CHARGE_MX4D = 1200;
    public static CHARGE_CVS = 150;

    /**
     * create QR code from reservation infos.
     */
    public static createQRCode(reservationId: string): Buffer {
        return qr.imageSync(reservationId, {
            type: 'png'
        });
    }
}
