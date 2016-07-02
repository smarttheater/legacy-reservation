import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../models/Reserve/ReservationModel';
import moment = require('moment');

export default class PerformanceController extends BaseController {
    /**
     * パフォーマンス検索API
     */
    public search(): void {
        let limit = (this.req.query.limit) ? this.req.query.limit : 300;
        let page = (this.req.query.page) ? this.req.query.page : 1;

        let day = (this.req.query.day) ? this.req.query.day : null; // 上映日
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
        this.addFilmConditions(andConditions, genre, words, (err, andConditions) => {

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
                        {},
                        {
                            sort : {film: 1, day: 1, start_time: 1},
                        }
                    )
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .populate('film screen theater')
                    .exec((err, performanceDocuments) => {
                        this.logger.debug('find performances processed.', err);

                        if (err) {
                            this.res.json({
                                isSuccess: false,
                                results: [],
                                count: 0
                            });

                        } else {
                            this.res.json({
                                isSuccess: true,
                                results: performanceDocuments,
                                count: count
                            });
                        }
                    });
                }
            );
        });
    }

    private addFilmConditions(andConditions: Array<Object>, genre: string, words: string, cb: (err: Error, andConditions: Array<Object>) => void) {

        let filmAndConditions: Array<Object> = [];
        if (genre) {
            // TODO ジャンル条件の追加方法
            // filmAndConditions.push({
            //     'genre': genre
            // });
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
