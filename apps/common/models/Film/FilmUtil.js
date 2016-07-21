"use strict";
var FilmUtil = (function () {
    function FilmUtil() {
    }
    /**
     * ジャンルリストを取得する
     */
    FilmUtil.getGenres = function () {
        return [
            {
                code: "01",
                name: "ヒューマンドラマ",
                name_en: "Human Drama"
            },
            {
                code: "02",
                name: "コメディ",
                name_en: "Comedy"
            },
            {
                code: "03",
                name: "ラブストーリー",
                name_en: "Love Story"
            },
            {
                code: "04",
                name: "エロス",
                name_en: "Eros"
            },
            {
                code: "05",
                name: "青春",
                name_en: "Youth Drama"
            },
        ];
    };
    /**
     * 部門リストを取得する
     */
    FilmUtil.getSections = function () {
        return [
            {
                code: "01",
                name: "コンペティション",
                name_en: "Competition"
            },
            {
                code: "02",
                name: "アジアの未来",
                name_en: "Asian Future"
            },
            {
                code: "03",
                name: "日本映画スプラッシュ",
                name_en: "Japanese Cinema Splash"
            },
            {
                code: "04",
                name: "特別招待作品",
                name_en: "Special Screenings"
            },
            {
                code: "05",
                name: "パノラマ",
                name_en: "Panorama"
            },
        ];
    };
    return FilmUtil;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FilmUtil;
