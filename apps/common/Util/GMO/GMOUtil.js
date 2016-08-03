"use strict";
/**
 * GMOペイメントユーティリティ
 */
class GMOUtil {
}
GMOUtil.PAY_TYPE_CREDIT = '0';
GMOUtil.PAY_TYPE_CVS = '3';
/** 未決済 */
GMOUtil.STATUS_CVS_UNPROCESSED = 'UNPROCESSED';
/** 要求成功 */
GMOUtil.STATUS_CVS_REQSUCCESS = 'REQSUCCESS';
/** 決済完了 */
GMOUtil.STATUS_CVS_PAYSUCCESS = 'PAYSUCCESS';
/** 決済失敗 */
GMOUtil.STATUS_CVS_PAYFAIL = 'PAYFAIL';
/** 期限切れ */
GMOUtil.STATUS_CVS_EXPIRED = 'EXPIRED';
/** 支払い停止 */
GMOUtil.STATUS_CVS_CANCEL = 'CANCEL';
/** 未決済 */
GMOUtil.STATUS_CREDIT_UNPROCESSED = 'UNPROCESSED';
/** 未決済(3D 登録済) */
GMOUtil.STATUS_CREDIT_AUTHENTICATED = 'AUTHENTICATED';
/** 有効性チェック */
GMOUtil.STATUS_CREDIT_CHECK = 'CHECK';
/** 即時売上 */
GMOUtil.STATUS_CREDIT_CAPTURE = 'CAPTURE';
/** 仮売上 */
GMOUtil.STATUS_CREDIT_AUTH = 'AUTH';
/** 実売上 */
GMOUtil.STATUS_CREDIT_SALES = 'SALES';
/** 取消 */
GMOUtil.STATUS_CREDIT_VOID = 'VOID';
/** 返品 */
GMOUtil.STATUS_CREDIT_RETURN = 'RETURN';
/** 月跨り返品 */
GMOUtil.STATUS_CREDIT_RETURNX = 'RETURNX';
/** 簡易オーソリ */
GMOUtil.STATUS_CREDIT_SAUTH = 'SAUTH';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOUtil;
