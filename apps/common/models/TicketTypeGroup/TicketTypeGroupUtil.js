"use strict";
var TicketTypeGroupUtil = (function () {
    function TicketTypeGroupUtil() {
    }
    TicketTypeGroupUtil.getAll = function () {
        return [
            {
                name: "オープニング",
                name_en: "Opening",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "クロージング",
                name_en: "Closing",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "特別招待作品",
                name_en: "Special Invitation",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 2000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 1500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "パノラマ",
                name_en: "Panorama",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "ワールドフォーカス",
                name_en: "World Focus",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "東京グランプリ受賞作品",
                name_en: "Tokyo Grand Prix",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "コンペティション",
                name_en: "Competition",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "アジアの未来",
                name_en: "Asia Future",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "日本映画スプラッシュ",
                name_en: "Japanese Cinema Splash",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "CROSSCUT ASIA",
                name_en: "Crosscut Asia",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "観客賞受賞作品",
                name_en: "Audience Award",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1300,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "Japan Now",
                name_en: "Japan Now",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1800,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 1500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "日本映画クラシックス",
                name_en: "Japanese Classics",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "みなと上映会",
                name_en: "Minato",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "日本映画監督協会新人賞",
                name_en: "New Face Award",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "PFFグランプリ受賞作品上映",
                name_en: "PFF Grand Prix",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "SKIPシティ国際Dシネマ映画祭上映作品",
                name_en: "SKIP City",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "WOWOW映画工房200会記念",
                name_en: "WOWOW",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 4500,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 4500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 4500,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "東京国際映画祭プレゼンツ歌舞伎座スペシャルナイト",
                name_en: "Kabukiza Special Night",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 10000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 10000,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 10000,
                        is_on_the_day: true
                    }
                ]
            },
            {
                name: "日本学生映画祭",
                name_en: "Japanese Students Film Festival",
                types: [
                    {
                        code: '01',
                        name: '一般',
                        name_en: 'Adults',
                        charge: 1000,
                        is_on_the_day: false
                    },
                    {
                        code: '02',
                        name: '学生',
                        name_en: 'Students',
                        charge: 500,
                        is_on_the_day: false
                    },
                    {
                        code: '03',
                        name: '学生当日',
                        name_en: 'Students on the day',
                        charge: 500,
                        is_on_the_day: true
                    }
                ]
            }
        ];
    };
    return TicketTypeGroupUtil;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TicketTypeGroupUtil;
