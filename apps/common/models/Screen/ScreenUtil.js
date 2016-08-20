"use strict";
class ScreenUtil {
    static getSeatGrades() {
        return [
            {
                name: 'ノーマルシート',
                name_en: 'Normal Seat',
                additional_charge: 0
            },
            {
                name: 'プレミアボックスシート',
                name_en: 'Premiere Box Seat',
                additional_charge: 1000
            },
            {
                name: 'プレミアラグジュアリーシート',
                name_en: 'Premiere Luxury Seat',
                additional_charge: 3000
            }
        ];
    }
    static sortBySeatCode(a, b) {
        let rowA = a.substr(0, 1); // 行
        let rowB = b.substr(0, 1); // 行
        let columnA = a.substr(2); // 列
        let columnB = b.substr(2); // 列
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenUtil;
