import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';
import PerformanceStatusesModel from '../../models/PerformanceStatusesModel';
import moment = require('moment');

export default class PerformanceController extends BaseController {
    /**
     * パフォーマンス検索API
     */
    public search(): void {
        let limit = (this.req.query.limit) ? this.req.query.limit : 100;
        let page = (this.req.query.page) ? this.req.query.page : 1;

        let day = (this.req.query.day) ? this.req.query.day : null; // 上映日
        let section = (this.req.query.section) ? this.req.query.section : null; // 部門
        let genre = (this.req.query.genre) ? this.req.query.genre : null; // ジャンル
        let words = (this.req.query.words) ? this.req.query.words : null; // フリーワード

        // 検索条件を作成
        let andConditions: Array<Object> = [];

        // デフォルトで、現在日以降のもの
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
        this.addFilmConditions(andConditions, section, genre, words, (err, andConditions) => {

            let conditions = {
                $and: andConditions
            };
            this.logger.debug('conditions:', conditions);

            // 総数検索
            Models.Performance.count(
                conditions,
                (err, count) => {

                    Models.Performance.find(
                        conditions,
                        'day start_time end_time film screen theater', // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                        {
                            sort : {film: 1, day: 1, start_time: 1},
                        }
                    )
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .populate('film', 'name name_en') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                    .populate('screen', 'name name_en') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                    .populate('theater', 'name name_en') // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                    .exec((err, performanceDocuments) => {
                        this.logger.debug('find performances processed.', err);

                        let results = [];

                        // 空席情報を追加
                        PerformanceStatusesModel.find((err, performanceStatusesModel) => {
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

                            } else {
                                this.res.json({
                                    isSuccess: true,
                                    results: results,
                                    count: count
                                });

                            }

                        });

                    });
                }
            );
        });
    }

    private addFilmConditions(andConditions: Array<Object>, section: string, genre: string, words: string, cb: (err: Error, andConditions: Array<Object>) => void) {

        let filmAndConditions: Array<Object> = [];
        if (section) {
            // 部門条件の追加
            filmAndConditions.push({
                'sections.code': {$in: [section]}
            });
        }

        if (genre) {
            // ジャンル条件の追加
            filmAndConditions.push({
                'genres.code': {$in: [genre]}
            });
        }

        if (words) {
            filmAndConditions.push({
                $or: [
                    {
                        'name': {$regex: `${words}`}
                    },
                    {
                        'name_en': {$regex: `${words}`}
                    }
                ]
            });
        }

        if (filmAndConditions.length > 0) {
            let filmConditions = {
                $and: filmAndConditions
            };

            Models.Film.find(
                filmConditions,
                '_id',
                {},
                (err, filmDocuments) => {
                    if (err) {
                        cb(err, andConditions);
                    } else {
                        let filmIds = filmDocuments.map((filmDocument) => {
                            return filmDocument.get('_id');
                        });

                        if (filmIds.length > 0) {
                            andConditions.push({
                                'film': {
                                    $in: filmIds
                                }
                            });
                        } else {
                            // 検索結果のない条件を追加
                            andConditions.push({
                                'film': null
                            });
                        }

                        cb(null, andConditions);
                    }
                }
            )
        } else {
            cb(null, andConditions);
        }
    }
}
