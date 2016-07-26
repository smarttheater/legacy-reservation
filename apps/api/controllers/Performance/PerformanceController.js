"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var Models_1 = require('../../../common/models/Models');
var PerformanceStatusesModel_1 = require('../../../common/models/PerformanceStatusesModel');
var moment = require('moment');
var PerformanceController = (function (_super) {
    __extends(PerformanceController, _super);
    function PerformanceController() {
        _super.apply(this, arguments);
    }
    /**
     * パフォーマンス検索API
     */
    PerformanceController.prototype.search = function () {
        var _this = this;
        var limit = (this.req.query.limit) ? this.req.query.limit : 100;
        var page = (this.req.query.page) ? this.req.query.page : 1;
        var day = (this.req.query.day) ? this.req.query.day : null; // 上映日
        var section = (this.req.query.section) ? this.req.query.section : null; // 部門
        var genre = (this.req.query.genre) ? this.req.query.genre : null; // ジャンル
        var words = (this.req.query.words) ? this.req.query.words : null; // フリーワード
        // 検索条件を作成
        var andConditions = [];
        // デフォルトで、現在日以降のもの
        // TODO 上映開始を20分過ぎたら出さない
        andConditions.push({
            'day': {
                $gte: moment().add(-5, 'minutes').toISOString(),
            }
        });
        if (day) {
            andConditions.push({
                'day': day
            });
        }
        // 作品条件を追加する
        this.addFilmConditions(andConditions, section, genre, words, function (err, andConditions) {
            var conditions = {
                $and: andConditions
            };
            _this.logger.debug('conditions:', conditions);
            // 総数検索
            Models_1.default.Performance.count(conditions, function (err, count) {
                // TODO ソート 上映日時昇順
                var query = Models_1.default.Performance.find(conditions, 'day start_time end_time film screen theater', // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                {
                    sort: { film: 1, day: 1, start_time: 1 },
                }).skip(limit * (page - 1))
                    .limit(limit);
                if (_this.req.getLocale() === 'ja') {
                    query.populate('film', 'name') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        .populate('screen', 'name') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        .populate('theater', 'name'); // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                }
                else {
                    query.populate('film', 'name_en') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        .populate('screen', 'name_en') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        .populate('theater', 'name_en'); // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                }
                query.exec(function (err, performanceDocuments) {
                    _this.logger.debug('find performances processed.', err);
                    var results = [];
                    // 空席情報を追加
                    PerformanceStatusesModel_1.default.find(function (err, performanceStatusesModel) {
                        performanceDocuments.forEach(function (performanceDocument) {
                            var result = performanceDocument.toObject();
                            result['seat_status'] = performanceStatusesModel.getStatus(performanceDocument.get('_id'));
                            results.push(result);
                        });
                        if (err) {
                            _this.res.json({
                                isSuccess: false,
                                results: [],
                                count: 0
                            });
                        }
                        else {
                            _this.res.json({
                                isSuccess: true,
                                results: results,
                                count: count
                            });
                        }
                    });
                });
            });
        });
    };
    PerformanceController.prototype.addFilmConditions = function (andConditions, section, genre, words, cb) {
        var filmAndConditions = [];
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
        // TODO フリーワードの検索対象はタイトル(日英両方)
        // TODO 空白つなぎでOR検索
        if (words) {
            filmAndConditions.push({
                $or: [
                    {
                        'name': { $regex: "" + words }
                    },
                    {
                        'name_en': { $regex: "" + words }
                    }
                ]
            });
        }
        if (filmAndConditions.length > 0) {
            var filmConditions = {
                $and: filmAndConditions
            };
            Models_1.default.Film.find(filmConditions, '_id', {}, function (err, filmDocuments) {
                if (err) {
                    cb(err, andConditions);
                }
                else {
                    var filmIds = filmDocuments.map(function (filmDocument) {
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
    };
    return PerformanceController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
