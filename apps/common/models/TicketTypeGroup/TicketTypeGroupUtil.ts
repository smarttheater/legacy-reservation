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
                name: {
                    ja: "オープニング",
                    en: "Opening",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '002',
                name: {
                    ja: "クロージング",
                    en: "Closing",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '003',
                name: {
                    ja: "特別招待作品",
                    en: "Special Invitation",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '004',
                name: {
                    ja: "パノラマ",
                    en: "Panorama",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '005',
                name: {
                    ja: "ワールドフォーカス",
                    en: "World Focus",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '006',
                name: {
                    ja: "東京グランプリ受賞作品",
                    en: "Tokyo Grand Prix",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '007',
                name: {
                    ja: "コンペティション",
                    en: "Competition",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '008',
                name: {
                    ja: "アジアの未来",
                    en: "Asia Future",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '009',
                name: {
                    ja: "日本映画スプラッシュ",
                    en: "Japanese Cinema Splash",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '010',
                name: {
                    ja: "CROSSCUT ASIA",
                    en: "Crosscut Asia",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '011',
                name: {
                    ja: "観客賞受賞作品",
                    en: "Audience Award",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '012',
                name: {
                    ja: "Japan Now",
                    en: "Japan Now",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1800,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '013',
                name: {
                    ja: "日本映画クラシックス",
                    en: "Japanese Classics",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '014',
                name: {
                    ja: "みなと上映会",
                    en: "Minato",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '015',
                name: {
                    ja: "日本映画監督協会新人賞",
                    en: "New Face Award",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '016',
                name: {
                    ja: "PFFグランプリ受賞作品上映",
                    en: "PFF Grand Prix",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '017',
                name: {
                    ja: "SKIPシティ国際Dシネマ映画祭上映作品",
                    en: "SKIP City",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '018',
                name: {
                    ja: "WOWOW映画工房200会記念",
                    en: "WOWOW",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 4500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 4500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 4500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '019',
                name: {
                    ja: "東京国際映画祭プレゼンツ歌舞伎座スペシャルナイト",
                    en: "Kabukiza Special Night",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 10000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 10000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
                        charge: 10000,
                        is_on_the_day: true
                    }
                ]
            },
            {
                _id: '020',
                name: {
                    ja: "日本学生映画祭",
                    en: "Japanese Students Film Festival",
                },
                types: [
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS,
                        name: {
                            ja: '一般',
                            en: 'Adults'
                        },
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS,
                        name: {
                            ja: '学生',
                            en: 'Students'
                        },
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY,
                        name: {
                            ja: '学生当日',
                            en: 'Students on the day'
                        },
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
