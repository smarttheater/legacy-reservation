import bwipjs = require('bwip-js');
import qr = require('qr-image');

export default class ReservationUtil {
    public static STATUS_AVAILABLE = 'AVAILABLE'; // 空席
    public static STATUS_TEMPORARY = 'TEMPORARY'; // 仮予約
    public static STATUS_RESERVED = 'RESERVED'; // 予約確定
    public static STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT'; // 決済待ち
    public static STATUS_WAITING_SETTLEMENT_WINDOW = 'WAITING_SETTLEMENT_WINDOW'; // 窓口清算待ち
    public static STATUS_KEPT_BY_TIFF = 'KEPT_BY_TIFF'; // 関係者席保留
    public static STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER'; // メルマガ会員保留

    /**
     * create barcode from reservation infos.
     */
    public static createBarcode(reservationId: string, cb: (err: string|Error, png: Buffer) => void): void {
        let text = reservationId;

        // creating barcode...
        bwipjs.toBuffer({
                bcid:        'code128',     // Barcode type
                text:        text,          // Text to encode
                scale:       3,             // 3x scaling factor
                height:      40,            // Bar height, in millimeters
                includetext: true,          // Show human-readable text
                textxalign:  'center',      // Always good to set this
                // textfont:    'Inconsolata', // Use your custom font
                textsize:    13             // Font size, in points
            }, (err, png) => {
                cb(err, png);

            }
        );

    }

    /**
     * create QR code from reservation infos.
     */
    public static createQRCode(reservationId: string) {
        let text = reservationId;

        return qr.image(text, {
            type: 'png'
        });
    }
}
