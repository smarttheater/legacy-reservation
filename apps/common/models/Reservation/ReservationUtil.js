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
ReservationUtil.STATUS_AVAILABLE = 'AVAILABLE'; // 空席
ReservationUtil.STATUS_TEMPORARY = 'TEMPORARY'; // 仮予約
ReservationUtil.STATUS_RESERVED = 'RESERVED'; // 予約確定
ReservationUtil.STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT'; // 決済待ち
ReservationUtil.STATUS_WAITING_SETTLEMENT_WINDOW = 'WAITING_SETTLEMENT_WINDOW'; // 窓口清算待ち
ReservationUtil.STATUS_KEPT_BY_TIFF = 'KEPT_BY_TIFF'; // 関係者席保留
ReservationUtil.STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER'; // メルマガ会員保留
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationUtil;
