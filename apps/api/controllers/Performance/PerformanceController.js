"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const PerformanceStatusesModel_1 = require('../../../common/models/PerformanceStatusesModel');
const moment = require('moment');
class PerformanceController extends BaseController_1.default {
    /**
     * パフォーマンス検索API
     */
    search() {
        let limit = (this.req.query.limit) ? this.req.query.limit : 100; // せいぜい100件までにしておく(レスポンスタイム的に)
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let day = (this.req.query.day) ? this.req.query.day : null; // 上映日
        let section = (this.req.query.section) ? this.req.query.section : null; // 部門
        let words = (this.req.query.words) ? this.req.query.words : null; // フリーワード
        let startFrom = (this.req.query.start_from) ? this.req.query.start_from : null; // この時間以降開始のパフォーマンスに絞る(timestamp)
        // 検索条件を作成
        let andConditions = [];
        if (day) {
            andConditions.push({
                'day': day
            });
        }
        if (startFrom) {
            let now = moment.unix(startFrom);
            let tomorrow = moment.unix(startFrom).add(+24, 'hours');
            andConditions.push({
                $or: [
                    {
                        'day': now.format('YYYYMMDD'),
                        'start_time': {
                            $gte: now.format('HHmm')
                        }
                    },
                    {
                        'day': {
                            $gte: tomorrow.format('YYYYMMDD')
                        }
                    }
                ]
            });
        }
        // 作品条件を追加する
        this.addFilmConditions(andConditions, section, words, (err, andConditions) => {
            let conditions = null;
            if (andConditions.length > 0) {
                conditions = {
                    $and: andConditions
                };
            }
            // 作品件数取得
            Models_1.default.Performance.distinct('film', conditions, (err, filmIds) => {
                if (err) {
                    return this.res.json({
                        isSuccess: false,
                        results: [],
                        performancesCount: 0,
                        filmsCount: 0
                    });
                }
                // 総数検索
                Models_1.default.Performance.count(conditions, (err, performancesCount) => {
                    if (err) {
                        return this.res.json({
                            isSuccess: false,
                            results: [],
                            performancesCount: 0,
                            filmsCount: 0
                        });
                    }
                    // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                    let query = Models_1.default.Performance.find(conditions, 'day start_time end_time film screen theater').skip(limit * (page - 1)).limit(limit);
                    if (this.req.getLocale() === 'ja') {
                        query.populate('film', 'name.ja image sections.name.ja minutes')
                            .populate('screen', 'name.ja')
                            .populate('theater', 'name.ja');
                    }
                    else {
                        query.populate('film', 'name.en image sections.name.en minutes')
                            .populate('screen', 'name.en')
                            .populate('theater', 'name.en');
                    }
                    // 上映日、開始時刻
                    // TODO 作品名昇順を追加？
                    query.setOptions({
                        sort: {
                            day: 1,
                            start_time: 1,
                        },
                    });
                    query.exec((err, performances) => {
                        if (err) {
                            return this.res.json({
                                isSuccess: false,
                                results: [],
                                performancesCount: 0,
                                filmsCount: 0
                            });
                        }
                        // 空席情報を追加
                        PerformanceStatusesModel_1.default.find((err, performanceStatusesModel) => {
                            let results = performances.map((performance) => {
                                return {
                                    _id: performance.get('_id'),
                                    day: performance.get('day'),
                                    start_time: performance.get('start_time'),
                                    end_time: performance.get('end_time'),
                                    seat_status: performanceStatusesModel.getStatus(performance.get('_id')),
                                    theater_name: performance.get('theater').get('name')[this.req.getLocale()],
                                    screen_name: performance.get('screen').get('name')[this.req.getLocale()],
                                    film_id: performance.get('film').get('_id'),
                                    film_name: performance.get('film').get('name')[this.req.getLocale()],
                                    film_sections: performance.get('film').get('sections').map((section) => { return section['name'][this.req.getLocale()]; }),
                                    film_minutes: performance.get('film').get('minutes'),
                                    film_image: performance.get('film').get('image')
                                };
                            });
                            this.res.json({
                                isSuccess: true,
                                results: results,
                                performancesCount: performancesCount,
                                filmsCount: filmIds.length
                            });
                        });
                    });
                });
            });
        });
    }
    addFilmConditions(andConditions, section, words, cb) {
        let filmAndConditions = [];
        if (section) {
            // 部門条件の追加
            filmAndConditions.push({
                'sections.code': { $in: [section] }
            });
        }
        // フリーワードの検索対象はタイトル(日英両方)
        // 空白つなぎでOR検索
        if (words) {
            // trim and to half-width space
            words = words.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            let regexes = words.split(' ').filter((value) => { return (value.length > 0); });
            let orConditions = [];
            for (let regex of regexes) {
                orConditions.push({
                    'name.ja': { $regex: `${regex}` }
                }, {
                    'name.en': { $regex: `${regex}` }
                });
            }
            filmAndConditions.push({
                $or: orConditions
            });
        }
        if (filmAndConditions.length > 0) {
            let filmConditions = {
                $and: filmAndConditions
            };
            Models_1.default.Film.distinct('_id', filmConditions, (err, filmIds) => {
                if (err) {
                    // 検索結果のない条件を追加
                    andConditions.push({
                        'film': null
                    });
                    cb(err, andConditions);
                }
                else {
                    // let filmIds = films.map((filmDocument) => {
                    //     return filmDocument.get('_id');
                    // });
                    if (filmIds.length > 0) {
                        andConditions.push({
                            'film': {
                                $in: filmIds
                            }
                        });
                    }
                    else {
                        // 検索結果のない条件を追加
                        andConditions.push({
                            'film': null
                        });
                    }
                    cb(null, andConditions);
                }
            });
        }
        else {
            // 全作品数を取得
            cb(null, andConditions);
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
