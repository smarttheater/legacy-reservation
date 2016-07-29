export default class ScreenUtil {
    public static getSeatGrades() {
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
}
