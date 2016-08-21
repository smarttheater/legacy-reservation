import BaseController from '../BaseController';
import Constants from '../../../common/Util/Constants';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import PerformanceUtil from '../../../common/models/Performance/PerformanceUtil';
import FilmUtil from '../../../common/models/Film/FilmUtil';
import TicketTypeGroupUtil from '../../../common/models/TicketTypeGroup/TicketTypeGroupUtil';
import ScreenUtil from '../../../common/models/Screen/ScreenUtil';
import moment = require('moment');
import conf = require('config');
import mongoose = require('mongoose');
import PerformanceStatusesModel from '../../../common/models/PerformanceStatusesModel';

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class PerformanceController extends BaseController {
    private shuffle(array) {
        let m = array.length, t, i;

        // While there remain elements to shuffle…
        while (m) {

            // Pick a remaining element…
            i = Math.floor(Math.random() * m--);

            // And swap it with the current element.
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }

        return array;
    }

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
                let days = ['20161022', '20161023', '20161024', '20161025', '20161026', '20161027', '20161028'];
                let starts = ['0900', '1200', '1800'];
                let ends = ['1100', '1400', '2000'];

                // スクリーンごとに4時間帯のスケジュールを登録する
                screens.forEach((screen) => {
                    days.forEach((day) => {
                        starts.forEach((start, index) => {

                            // 作品を選考する
                            this.logger.debug('selecting film...');
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

    public calculateStatuses() {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Performance.find(
            {},
            'day start_time screen'
        ).populate('screen', 'sections')
        .exec((err, performanceDocuments) => {
            let promises = [];
            let now = moment().format('YYYYMMDDHHmm');
            let performanceStatusesModel = new PerformanceStatusesModel();

            performanceDocuments.forEach((performanceDocument) => {
                // パフォーマンスごとに空席割合を算出する
                promises.push(new Promise((resolve, reject) => {
                    Models.Reservation.count(
                        {
                            performance: performanceDocument.get('_id')
                        }
                        ,(err, reservationCount) => {
                            if (err) {

                            } else {
                                console.log(reservationCount);

                                let seatCount = performanceDocument.get('screen').get('sections')[0].seats.length;
                                let start = performanceDocument.get('day') + performanceDocument.get('start_time');
                                let status = PerformanceUtil.seatNum2status(reservationCount, seatCount, start, now);
                                performanceStatusesModel.setStatus(performanceDocument.get('_id'), status);

                            }

                            resolve();

                        }
                    );

                }));

            });


            Promise.all(promises).then(() => {
                performanceStatusesModel.save((err) => {
                    this.logger.debug('success!');
                    mongoose.disconnect();
                    process.exit(0);
                });

            }, (err) => {
                this.logger.debug('fail.');
                mongoose.disconnect();
                process.exit(0);

            });
        });
    }
}
