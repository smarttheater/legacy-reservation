"use strict";
const bwipjs = require('bwip-js');
const qr = require('qr-image');
class ReservationUtil {
    /**
     * create barcode from reservation infos.
     */
    static createBarcode(reservationId, cb) {
        let text = reservationId;
        // creating barcode...
        bwipjs.toBuffer({
            bcid: 'code128',
            text: text,
            scale: 2,
            height: 40,
            includetext: true,
            textxalign: 'center',
            // textfont:    'Inconsolata', // Use your custom font
            textsize: 13,
            paddingwidth: 40,
            paddingheight: 20
        }, (err, png) => {
            cb(err, png);
        });
    }
    /**
     * create QR code from reservation infos.
     */
    static createQRCode(reservationId) {
        let text = reservationId;
        return qr.imageSync(text, {
            type: 'png'
        });
    }
}
/** 仮予約 */
ReservationUtil.STATUS_TEMPORARY = 'TEMPORARY';
/** GMOプロセス中 */
ReservationUtil.STATUS_GMO_PROCESSING = 'GMO_PROCESSING';
/** 決済待ち */
ReservationUtil.STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT';
/**  窓口清算待ち */
ReservationUtil.STATUS_WAITING_SETTLEMENT_WINDOW = 'WAITING_SETTLEMENT_WINDOW';
/** 関係者席保留 */
ReservationUtil.STATUS_KEPT_BY_TIFF = 'KEPT_BY_TIFF';
/** メルマガ会員保留 */
ReservationUtil.STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER';
/** 予約確定 */
ReservationUtil.STATUS_RESERVED = 'RESERVED';
/** 一般 */
ReservationUtil.PURCHASER_GROUP_CUSTOMER = '01';
/** メルマガ会員先行 */
ReservationUtil.PURCHASER_GROUP_MEMBER = '02';
/** 外部関係者 */
ReservationUtil.PURCHASER_GROUP_SPONSOR = '03';
/** 内部関係者 */
ReservationUtil.PURCHASER_GROUP_STAFF = '04';
/** 電話 */
ReservationUtil.PURCHASER_GROUP_TEL = '05';
/** 窓口 */
ReservationUtil.PURCHASER_GROUP_WINDOW = '06';
ReservationUtil.CHARGE_MX4D = 1200;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationUtil;
