export default class ScreenUtil {
    /** ノーマルシート */
    public static SEAT_GRADE_CODE_NORMAL = '00';
    /** プレミアボックスシート */
    public static SEAT_GRADE_CODE_PREMIERE_BOX = '01';
    /** プレミアラグジュアリーシート */
    public static SEAT_GRADE_CODE_PREMIERE_LUXURY = '02';
    /** フロントリクライニングシート */
    public static SEAT_GRADE_CODE_RECLINING = '03';

    public static getSeatGrades() {
        return [
            {
                code: ScreenUtil.SEAT_GRADE_CODE_NORMAL,
                name: {
                    ja: 'ノーマルシート',
                    en: 'Normal Seat',
                },
                additional_charge: 0
            },
            {
                code: ScreenUtil.SEAT_GRADE_CODE_PREMIERE_BOX,
                name: {
                    ja: 'プレミアボックスシート',
                    en: 'Premiere Box Seat',
                },
                additional_charge: 1000
            },
            {
                code: ScreenUtil.SEAT_GRADE_CODE_PREMIERE_LUXURY,
                name: {
                    ja: 'プレミアラグジュアリーシート',
                    en: 'Premiere Luxury Seat',
                },
                additional_charge: 3000
            },
            {
                code: ScreenUtil.SEAT_GRADE_CODE_RECLINING,
                name: {
                    ja: 'フロントリクライニングシート',
                    en: 'Front Reclining Seat',
                },
                additional_charge: 3000
            }
        ];
    }

    public static sortBySeatCode(a: string, b:string): number {
        let rowA = a.substr(0, 1); // 行
        let rowB = b.substr(0, 1); // 行
        let columnA = a.substr(2); // 列
        let columnB = b.substr(2); // 列

        if (rowA < rowB) {
            return -1;
        } else if (rowA > rowB) {
            return 1;
        } else {
            if (parseInt(columnA) < parseInt(columnB)) {
                return -1;
            } else {
                return 1;
            }
        }
    }
}
