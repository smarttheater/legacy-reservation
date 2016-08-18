export default class TicketTypeGroupUtil {
    public static TICKET_TYPE_CODE_ADULTS = '01';
    public static TICKET_TYPE_CODE_STUDENTS = '02';
    public static TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = '03';
    public static TICKET_TYPE_CODE_FREE= '00';
    public static TICKET_TYPE_CODE_NOT_FOR_SALE= '99';

    public static getAll() {
        return [
            {
                _id: '001',
                name: "オープニング",
                name_en: "Opening",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '002',
                name: "クロージング",
                name_en: "Closing",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '003',
                name: "特別招待作品",
                name_en: "Special Invitation",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '004',
                name: "パノラマ",
                name_en: "Panorama",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '005',
                name: "ワールドフォーカス",
                name_en: "World Focus",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '006',
                name: "東京グランプリ受賞作品",
                name_en: "Tokyo Grand Prix",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '007',
                name: "コンペティション",
                name_en: "Competition",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '008',
                name: "アジアの未来",
                name_en: "Asia Future",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '009',
                name: "日本映画スプラッシュ",
                name_en: "Japanese Cinema Splash",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '010',
                name: "CROSSCUT ASIA",
                name_en: "Crosscut Asia",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '011',
                name: "観客賞受賞作品",
                name_en: "Audience Award",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '012',
                name: "Japan Now",
                name_en: "Japan Now",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1800,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '013',
                name: "日本映画クラシックス",
                name_en: "Japanese Classics",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '014',
                name: "みなと上映会",
                name_en: "Minato",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '015',
                name: "日本映画監督協会新人賞",
                name_en: "New Face Award",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '016',
                name: "PFFグランプリ受賞作品上映",
                name_en: "PFF Grand Prix",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '017',
                name: "SKIPシティ国際Dシネマ映画祭上映作品",
                name_en: "SKIP City",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '018',
                name: "WOWOW映画工房200会記念",
                name_en: "WOWOW",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 4500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 4500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 4500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '019',
                name: "東京国際映画祭プレゼンツ歌舞伎座スペシャルナイト",
                name_en: "Kabukiza Special Night",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 10000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 10000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 10000,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '020',
                name: "日本学生映画祭",
                name_en: "Japanese Students Film Festival",
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            }
        ];
    }

    /**
     * 内部関係者用券種グループを取得する
     */
    public static getOne4staff() {
        return [
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_FREE,
                name: '無料',
                name_en: 'Free',
                charge: 0, // 料金
                is_on_the_day: false
            },
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
                name: 'Not for sale',
                name_en: 'Not for Sale',
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
                name: 'Not for sale',
                name_en: 'Not for Sale',
                charge: 0, // 料金
                is_on_the_day: false
            }
        ];
    }
}
