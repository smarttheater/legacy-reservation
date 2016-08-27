"use strict";
class ScreenUtil {
    static sortBySeatCode(a, b) {
        let typhenIndexA = a.lastIndexOf('-');
        let typhenIndexB = b.lastIndexOf('-');
        let rowA = a.substr(0, typhenIndexA); // 行
        let rowB = b.substr(0, typhenIndexB); // 行
        let columnA = a.substr(typhenIndexA + 1); // 列
        let columnB = b.substr(typhenIndexB + 1); // 列
        if (rowA < rowB) {
            return -1;
        }
        else if (rowA > rowB) {
            return 1;
        }
        else {
            if (parseInt(columnA) < parseInt(columnB)) {
                return -1;
            }
            else {
                return 1;
            }
        }
    }
}
/** ノーマルシート */
ScreenUtil.SEAT_GRADE_CODE_NORMAL = '00';
/** プレミアボックスシート */
ScreenUtil.SEAT_GRADE_CODE_PREMIERE_BOX = '01';
/** プレミアラグジュアリーシート */
ScreenUtil.SEAT_GRADE_CODE_PREMIERE_LUXURY = '02';
/** フロントリクライニングシート */
ScreenUtil.SEAT_GRADE_CODE_FRONT_RECLINING = '03';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenUtil;
