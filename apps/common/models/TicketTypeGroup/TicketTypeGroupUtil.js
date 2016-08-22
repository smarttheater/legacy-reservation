"use strict";
class TicketTypeGroupUtil {
    static getAll() {
        return [
            {
                _id: '01',
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
                _id: '02',
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
                _id: '03',
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
                _id: '04',
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
                _id: '05',
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
                _id: '06',
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
                _id: '07',
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
                _id: '08',
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
                _id: '09',
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
                _id: '10',
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
                _id: '11',
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
                _id: '12',
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
                _id: '13',
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
                _id: '14',
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
                _id: '15',
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
                _id: '16',
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
                _id: '17',
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
                _id: '18',
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
                _id: '19',
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
                _id: '20',
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
    static getOne4staff() {
        return [
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_FREE,
                name: {
                    ja: '無料',
                    en: 'Free'
                },
                charge: 0,
                is_on_the_day: false
            },
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
                name: {
                    ja: 'Not for sale',
                    en: 'Not for Sale'
                },
                charge: 0,
                is_on_the_day: false
            },
        ];
    }
    /**
     * 外部関係者用券種グループを取得する
     */
    static getOne4sponsor() {
        return [
            {
                code: TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE,
                name: {
                    ja: 'Not for sale',
                    en: 'Not for Sale'
                },
                charge: 0,
                is_on_the_day: false
            }
        ];
    }
}
TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS = '01';
TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS = '02';
TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY = '03';
TicketTypeGroupUtil.TICKET_TYPE_CODE_FREE = '00';
TicketTypeGroupUtil.TICKET_TYPE_CODE_NOT_FOR_SALE = '99';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TicketTypeGroupUtil;
