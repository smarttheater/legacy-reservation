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
        let limit = (this.req.query.limit) ? this.req.query.limit : 100;
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let day = (this.req.query.day) ? this.req.query.day : null; // 上映日
        let section = (this.req.query.section) ? this.req.query.section : null; // 部門
        let genre = (this.req.query.genre) ? this.req.query.genre : null; // ジャンル
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
        this.addFilmConditions(andConditions, section, genre, words, (err, andConditions) => {
            let conditions = null;
            if (andConditions.length > 0) {
                conditions = {
                    $and: andConditions
                };
            }
            this.logger.debug('conditions:', conditions);
            // 総数検索
            Models_1.default.Performance.count(conditions, (err, count) => {
                let query = Models_1.default.Performance.find(conditions, 'day start_time end_time film screen theater' // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                ).skip(limit * (page - 1)).limit(limit);
                if (this.req.getLocale() === 'ja') {
                    query.populate('film', 'name image sections.name genres.name minutes') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        .populate('screen', 'name') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        .populate('theater', 'name'); // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                }
                else {
                    query.populate('film', 'name_en image sections.name_en genres.name_en minutes') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        .populate('screen', 'name_en') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        .populate('theater', 'name_en'); // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                }
                // 上映日、開始時刻
                // TODO 作品名昇順を追加？
                query.setOptions({
                    sort: {
                        day: 1,
                        start_time: 1,
                    },
                });
                query.exec((err, performanceDocuments) => {
                    this.logger.debug('find performances processed.', err);
                    let results = [];
                    // 空席情報を追加
                    PerformanceStatusesModel_1.default.find((err, performanceStatusesModel) => {
                        performanceDocuments.forEach((performanceDocument) => {
                            let result = performanceDocument.toObject();
                            result['seat_status'] = performanceStatusesModel.getStatus(performanceDocument.get('_id'));
                            results.push(result);
                        });
                        if (err) {
                            this.res.json({
                                isSuccess: false,
                                results: [],
                                count: 0
                            });
                        }
                        else {
                            this.res.json({
                                isSuccess: true,
                                results: results,
                                count: count
                            });
                        }
                    });
                });
            });
        });
    }
    addFilmConditions(andConditions, section, genre, words, cb) {
        let filmAndConditions = [];
        if (section) {
            // 部門条件の追加
            filmAndConditions.push({
                'sections.code': { $in: [section] }
            });
        }
        if (genre) {
            // ジャンル条件の追加
            filmAndConditions.push({
                'genres.code': { $in: [genre] }
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
                    'name': { $regex: `${regex}` }
                }, {
                    'name_en': { $regex: `${regex}` }
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
            Models_1.default.Film.find(filmConditions, '_id', {}, (err, filmDocuments) => {
                if (err) {
                    cb(err, andConditions);
                }
                else {
                    let filmIds = filmDocuments.map((filmDocument) => {
                        return filmDocument.get('_id');
                    });
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
            cb(null, andConditions);
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
