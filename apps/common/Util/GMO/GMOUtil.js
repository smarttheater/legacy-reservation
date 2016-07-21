"use strict";
/**
 * GMOペイメントユーティリティ
 */
var GMOUtil = (function () {
    function GMOUtil() {
    }
    GMOUtil.PAY_TYPE_CREDIT = '0';
    GMOUtil.PAY_TYPE_CVS = '3';
    GMOUtil.STATUS_CVS_UNPROCESSED = 'UNPROCESSED'; // 未決済
    GMOUtil.STATUS_CVS_REQSUCCESS = 'REQSUCCESS'; // 要求成功
    GMOUtil.STATUS_CVS_PAYSUCCESS = 'PAYSUCCESS'; // 決済完了
    GMOUtil.STATUS_CVS_PAYFAIL = 'PAYFAIL'; // 決済失敗
    GMOUtil.STATUS_CVS_EXPIRED = 'EXPIRED'; // 期限切れ
    GMOUtil.STATUS_CVS_CANCEL = 'CANCEL'; // 支払い停止
    GMOUtil.STATUS_CREDIT_UNPROCESSED = 'UNPROCESSED'; // 未決済
    GMOUtil.STATUS_CREDIT_AUTHENTICATED = 'AUTHENTICATED'; // 未決済(3D 登録済)
    GMOUtil.STATUS_CREDIT_CHECK = 'CHECK'; // 有効性チェック
    GMOUtil.STATUS_CREDIT_CAPTURE = 'CAPTURE'; // 即時売上
    GMOUtil.STATUS_CREDIT_AUTH = 'AUTH'; // 仮売上
    GMOUtil.STATUS_CREDIT_SALES = 'SALES'; // 実売上
    GMOUtil.STATUS_CREDIT_VOID = 'VOID'; // 取消
    GMOUtil.STATUS_CREDIT_RETURN = 'RETURN'; // 返品
    GMOUtil.STATUS_CREDIT_RETURNX = 'RETURNX'; // 月跨り返品
    GMOUtil.STATUS_CREDIT_SAUTH = 'SAUTH'; // 簡易オーソリ
    return GMOUtil;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOUtil;
