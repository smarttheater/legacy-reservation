import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import PerformanceUtil from '../../../common/models/Performance/PerformanceUtil';
import moment = require('moment');
import conf = require('config');
import mongoose = require('mongoose');
import PerformanceStatusesModel from '../../../common/models/PerformanceStatusesModel';

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class PerformanceController extends BaseController {
    /**
     * パフォーマンスを初期化する
     */
    public createAll() {
        mongoose.connect(MONGOLAB_URI, {});

        let performances = [];

        // 作品ごとのパフォーマンス数(最大3つになるように制御)
        let performancesByFilm = {};

        Models.Film.find({}, '_id', (err, films) => {
            Models.Screen.find({}, '_id theater', (err, screens) => {
                let days = [];
                let start = moment(conf.get<string>('datetimes.event_start'));
                let end = moment(conf.get<string>('datetimes.event_end'));
                while (start <= end) {
                    days.push(start.format('YYYYMMDD'));
                    start.add(+1, 'days');
                    continue;
                }

                let opens = ['0850', '1150', '1750', '2050', '2450'];
                let starts = ['0900', '1200', '1800', '2100', '2500'];
                let ends = ['1100', '1400', '2000', '2300', '2700'];

                // スクリーンごとに5時間帯のスケジュールを登録する
                screens.forEach((screen) => {
                    days.forEach((day) => {
                        starts.forEach((start, index) => {

                            // 作品を選考する
                            let _filmId;
                            while (_filmId === undefined) {
                                let _films = this.shuffle(films);
                                let _film = _films[0];

                                if (!performancesByFilm.hasOwnProperty(_film.get('_id'))) {
                                    performancesByFilm[_film.get('_id')] = [];
                                }

                                if (performancesByFilm[_film.get('_id')].length > 3) {
                                    continue;
                                } else {
                                    performancesByFilm[_film.get('_id')].push('performance');
                                    _filmId = _film.get('_id');
                                }
                            }



                            this.logger.debug('pushing performance...');
                            performances.push({
                                _id: day + screen.get('_id') + start,
                                theater: screen.get('theater'),
                                screen: screen.get('_id'),
                                film: _filmId,
                                day: day,
                                open_time: opens[index],
                                start_time: start,
                                end_time: ends[index]
                            });
                        });
                    });
                });




                // 全削除して一気に作成
                this.logger.debug('removing all performances...');
                Models.Performance.remove({}, (err) => {
                    this.logger.debug('creating performances...');
                    Models.Performance.create(
                        performances,
                        (err, performanceDocuments) => {
                            this.logger.debug('performances created.', err);

                            mongoose.disconnect();
                            process.exit(0);
                        }
                    );
                });

            });
        });
    }

    /**
     * 空席ステータスを更新する
     */
    public updateStatuses() {
        mongoose.connect(MONGOLAB_URI, {});

        this.logger.info('finding performances...');
        Models.Performance.find(
            {},
            'day start_time screen'
        ).populate('screen', 'sections')
        .exec((err, performances) => {
            this.logger.info('performances found.', err);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            let now = parseInt(moment().format('YYYYMMDDHHmm'));
            let performanceStatusesModel = new PerformanceStatusesModel();

            this.logger.info('aggregating...');
            Models.Reservation.aggregate(
                [
                    {
                        $group: {
                            _id: "$performance",
                            count: {$sum: 1}
                        }
                    }
                ],
                (err, results) => {
                    this.logger.info('aggregated.', err, results);
                    if (err) {
                        mongoose.disconnect();
                        process.exit(0);
                        return;
                    }

                    // パフォーマンスIDごとに
                    let reservationCounts = {};
                    for (let result of results) {
                        reservationCounts[result._id] = parseInt(result.count);
                    }

                    performances.forEach((performance) => {
                        // パフォーマンスごとに空席割合を算出する
                        if (reservationCounts.hasOwnProperty(performance.get('_id').toString())) {
                            let seatCount = performance.get('screen').get('sections')[0].seats.length;
                            let start = performance.get('day') + performance.get('start_time');
                            let status = PerformanceUtil.seatNum2status(reservationCounts[performance.get('_id').toString()], seatCount, start, now);
                            performanceStatusesModel.setStatus(performance.get('_id').toString(), status);
                        } else {
                            performanceStatusesModel.setStatus(performance.get('_id').toString(), PerformanceUtil.SEAT_STATUS_A);
                        }
                    });

                    this.logger.info('saving performanceStatusesModel...');
                    performanceStatusesModel.save((err) => {
                        mongoose.disconnect();
                        process.exit(0);
                    });
                }
            );
        });
    }
}
