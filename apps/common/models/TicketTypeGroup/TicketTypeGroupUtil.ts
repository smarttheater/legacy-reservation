export default class TicketTypeGroupUtil {
    public static TICKET_TYPE_CODE_ADULTS = '01';
    public static TICKET_TYPE_CODE_STUDENTS = '02';
    public static TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = '03';
    public static TICKET_TYPE_CODE_FREE= '00';
    public static TICKET_TYPE_CODE_NOT_FOR_SALE= '99';

    /**
     * 内部関係者用券種グループを取得する
     */
    public static getOne4staff() {
        return [
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_FREE,
                name: {
                    ja: '無料',
                    en: 'Free'
                },
                charge: 0, // 料金
                is_on_the_day: false
            },
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
                name: {
                    ja: 'Not for sale',
                    en: 'Not for Sale'
                },
                charge: 0, // 料金
                is_on_the_day: false
            },
        ];
    }

    /**
     * 外部関係者用券種グループを取得する
     */
    public static getOne4sponsor() {
        return [
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
                name: {
                    ja: 'Not for sale',
                    en: 'Not for Sale'
                },
                charge: 0, // 料金
                is_on_the_day: false
            }
        ];
    }
}
