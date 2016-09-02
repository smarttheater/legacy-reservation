"use strict";
class ReservationUtil {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationUtil;
