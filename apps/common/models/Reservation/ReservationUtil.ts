import bwipjs = require('bwip-js');
import qr = require('qr-image');

export default class ReservationUtil {
    /** 空席 */
    public static STATUS_AVAILABLE = 100;
    /** 仮予約 */
    public static STATUS_TEMPORARY = 110;
    /** 関係者席保留 */
    public static STATUS_KEPT_BY_TIFF = 111;
    /** メルマガ会員保留 */
    public static STATUS_KEPT_BY_MEMBER = 112;
    /** 決済待ち */
    public static STATUS_WAITING_SETTLEMENT = 120;
    /**  窓口清算待ち */
    public static STATUS_WAITING_SETTLEMENT_WINDOW = 121;
    /** 予約確定 */
    public static STATUS_RESERVED = 200;

    /** 一般 */
    public static PURCHASER_GROUP_CUSTOMER = '01'; 
    /** メルマガ会員先行 */
    public static PURCHASER_GROUP_MEMBER = '02';
    /** 外部関係者 */
    public static PURCHASER_GROUP_SPONROR = '03';
    /** 内部関係者 */
    public static PURCHASER_GROUP_STAFF = '04';
    /** 電話 */
    public static PURCHASER_GROUP_TEL = '05';
    /** 窓口 */
    public static PURCHASER_GROUP_WINDOW = '06';

    public static CHARGE_MX4D = 1200;

    /**
     * create barcode from reservation infos.
     */
    public static createBarcode(reservationId: string, cb: (err: string|Error, png: Buffer) => void): void {
        let text = reservationId;

        // creating barcode...
        bwipjs.toBuffer({
            bcid:        'code128',     // Barcode type
            text:        text,          // Text to encode
            scale:       2,             // 3x scaling factor
            height:      40,            // Bar height, in millimeters
            includetext: true,          // Show human-readable text
            textxalign:  'center',      // Always good to set this
            // textfont:    'Inconsolata', // Use your custom font
            textsize:    13,             // Font size, in points
            paddingwidth: 40,
            paddingheight: 20
        }, (err, png) => {
            cb(err, png);

        });

    }

    /**
     * create QR code from reservation infos.
     */
    public static createQRCode(reservationId: string): Buffer {
        let text = reservationId;

        return qr.imageSync(text, {
            type: 'png'
        });
    }
}
