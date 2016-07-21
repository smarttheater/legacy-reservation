"use strict";
var bwipjs = require('bwip-js');
var qr = require('qr-image');
var ReservationUtil = (function () {
    function ReservationUtil() {
    }
    /**
     * create barcode from reservation infos.
     */
    ReservationUtil.createBarcode = function (reservationId, cb) {
        var text = reservationId;
        // creating barcode...
        bwipjs.toBuffer({
            bcid: 'code128',
            text: text,
            scale: 3,
            height: 40,
            includetext: true,
            textxalign: 'center',
            // textfont:    'Inconsolata', // Use your custom font
            textsize: 13 // Font size, in points
        }, function (err, png) {
            cb(err, png);
        });
    };
    /**
     * create QR code from reservation infos.
     */
    ReservationUtil.createQRCode = function (reservationId) {
        var text = reservationId;
        return qr.image(text, {
            type: 'png'
        });
    };
    ReservationUtil.STATUS_AVAILABLE = 'AVAILABLE'; // 空席
    ReservationUtil.STATUS_TEMPORARY = 'TEMPORARY'; // 仮予約
    ReservationUtil.STATUS_RESERVED = 'RESERVED'; // 予約確定
    ReservationUtil.STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT'; // 決済待ち
    ReservationUtil.STATUS_WAITING_SETTLEMENT_WINDOW = 'WAITING_SETTLEMENT_WINDOW'; // 窓口清算待ち
    ReservationUtil.STATUS_KEPT_BY_TIFF = 'KEPT_BY_TIFF'; // 関係者席保留
    ReservationUtil.STATUS_KEPT_BY_MEMBER = 'KEPT_BY_MEMBER'; // メルマガ会員保留
    return ReservationUtil;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationUtil;
