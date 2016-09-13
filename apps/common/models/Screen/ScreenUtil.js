"use strict";
class ScreenUtil {
    /**
     * 座席コードのソート関数
     *
     * @param {string} a 座席コード
     * @param {string} b 座席コード
     */
    static sortBySeatCode(a, b) {
        let hyphenIndexA = a.lastIndexOf('-');
        let hyphenIndexB = b.lastIndexOf('-');
        let rowA = a.substr(0, hyphenIndexA); // 行
        let rowB = b.substr(0, hyphenIndexB); // 行
        let columnA = a.substr(hyphenIndexA + 1); // 列
        let columnB = b.substr(hyphenIndexB + 1); // 列
        if (rowA < rowB)
            return -1; // 行は文字列比較
        if (rowA > rowB)
            return 1; // 行は文字列比較
        if (parseInt(columnA) < parseInt(columnB))
            return -1; // 列は数値比較
        return 1;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenUtil;
/** ノーマルシート */
ScreenUtil.SEAT_GRADE_CODE_NORMAL = '00';
/** プレミアボックスシート */
ScreenUtil.SEAT_GRADE_CODE_PREMIERE_BOX = '01';
/** プレミアラグジュアリーシート */
ScreenUtil.SEAT_GRADE_CODE_PREMIERE_LUXURY = '02';
/** フロントリクライニングシート */
ScreenUtil.SEAT_GRADE_CODE_FRONT_RECLINING = '03';
