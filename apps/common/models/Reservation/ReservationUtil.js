"use strict";
const Models_1 = require('../Models');
class ReservationUtil {
    /**
     * 購入管理番号生成
     */
    static publishPaymentNo(cb) {
        Models_1.default.Sequence.findOneAndUpdate({ target: 'payment_no' }, { $inc: { no: 1 } }, { new: true }, (err, sequence) => {
            if (err) {
                cb(err, null);
            }
            else {
                let no = sequence.get('no');
                // 9桁になるように0で埋める
                let source = no.toString();
                while (source.length < 9) {
                    source = '0' + source;
                }
                let checKDigit = ReservationUtil.getCheckDigit(source);
                let checKDigit2 = ReservationUtil.getCheckDigit2(source);
                // sortTypes[checkDigit]で並べ替える
                let sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checKDigit];
                let paymentNo = checKDigit2.toString() + sortType.map((index) => { return source.substr(index, 1); }).join('') + checKDigit.toString();
                cb(err, paymentNo);
            }
        });
    }
    /**
     * チェックディジットを求める
     *
     * @param {string} source
     */
    static getCheckDigit(source) {
        if (source.length !== 9)
            throw new Error('source length must be 9.');
        let sum = 0;
        source.split('').reverse().forEach((digitNumber, index) => {
            sum += parseInt(digitNumber) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
        });
        let checkDigit = 11 - (sum % 11);
        // 2桁の場合0、1桁であればそのまま(必ず1桁になるように)
        return (checkDigit >= 10) ? 0 : checkDigit;
    }
    /**
     * チェックディジットを求める2
     *
     * @param {string} source
     */
    static getCheckDigit2(source) {
        if (source.length !== 9)
            throw new Error('source length must be 9.');
        let sum = 0;
        source.split('').reverse().forEach((digitNumber, index) => {
            sum += parseInt(digitNumber) * ReservationUtil.CHECK_DIGIT_WEIGHTS[index];
        });
        let checkDigit = 9 - (sum % 9);
        return checkDigit;
    }
    /**
     * 購入番号の有効性をチェックする
     *
     * @param {string} paymentNo
     */
    static isValidPaymentNo(paymentNo) {
        if (paymentNo.length !== 11)
            return false;
        let sequeceNo = ReservationUtil.decodePaymentNo(paymentNo);
        let checkDigit = ReservationUtil.getCheckDigit(sequeceNo);
        let checkDigit2 = ReservationUtil.getCheckDigit2(sequeceNo);
        return (parseInt(paymentNo.substr(-1)) === checkDigit && parseInt(paymentNo.substr(0, 1)) === checkDigit2);
    }
    static decodePaymentNo(paymentNo) {
        let checkDigit = parseInt(paymentNo.substr(-1));
        let strs = paymentNo.substr(1, paymentNo.length - 2);
        let sortType = ReservationUtil.SORT_TYPES_PAYMENT_NO[checkDigit];
        let sequeceNo = '';
        for (let i = 0; i < 9; i++) {
            sequeceNo += strs.substr(sortType.indexOf(i), 1);
        }
        return sequeceNo;
    }
}
/** 仮予約 */
ReservationUtil.STATUS_TEMPORARY = 'TEMPORARY';
/** TIFF確保上の仮予約 */
ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TIFF = 'TEMPORARY_ON_KEPT_BY_TIFF';
/** 決済待ち */
ReservationUtil.STATUS_WAITING_SETTLEMENT = 'WAITING_SETTLEMENT';
/**  ペイデザイン決済待ち */
ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN = 'WAITING_SETTLEMENT_PAY_DESIGN';
/** TIFF確保 */
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
/** MX4D追加料金 */
ReservationUtil.CHARGE_MX4D = 1200;
/** コンビニ決済手数料 */
ReservationUtil.CHARGE_CVS = 150;
ReservationUtil.CHECK_DIGIT_WEIGHTS = [2, 6, 3, 4, 3, 7, 5, 4, 2];
ReservationUtil.SORT_TYPES_PAYMENT_NO = [
    [5, 0, 2, 3, 7, 6, 1, 8, 4],
    [7, 6, 1, 0, 4, 8, 3, 5, 2],
    [3, 2, 8, 4, 1, 0, 5, 7, 6],
    [0, 1, 3, 8, 7, 2, 6, 5, 4],
    [8, 2, 5, 0, 6, 1, 4, 7, 3],
    [1, 8, 5, 4, 0, 7, 3, 2, 6],
    [2, 3, 8, 6, 5, 7, 1, 0, 4],
    [4, 0, 8, 5, 6, 2, 7, 1, 3],
    [6, 4, 7, 8, 5, 2, 3, 0, 1],
    [7, 2, 4, 8, 0, 3, 5, 6, 1]
];
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationUtil;
