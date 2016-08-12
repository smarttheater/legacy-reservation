"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const PerformanceUtil_1 = require('../../../common/models/Performance/PerformanceUtil');
const moment = require('moment');
const conf = require('config');
const mongoose = require('mongoose');
const PerformanceStatusesModel_1 = require('../../../common/models/PerformanceStatusesModel');
let MONGOLAB_URI = conf.get('mongolab_uri');
class PerformanceController extends BaseController_1.default {
    shuffle(array) {
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
    createAll() {
        mongoose.connect(MONGOLAB_URI, {});
        let performances = [];
        // 作品ごとのパフォーマンス数(最大3つになるように制御)
        let performancesByFilm = {};
        Models_1.default.Film.find({}, '_id', (err, films) => {
            Models_1.default.Screen.find({}, '_id theater', (err, screens) => {
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
                                }
                                else {
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
                                end_time: ends[index],
                                is_mx4d: this.shuffle([true, false, false, false])[0],
                                created_user: 'system',
                                updated_user: 'system'
                            });
                        });
                    });
                });
                // 全削除して一気に作成
                this.logger.debug('removing all performances...');
                Models_1.default.Performance.remove({}, (err) => {
                    this.logger.debug('creating performances...');
                    Models_1.default.Performance.create(performances, (err, performanceDocuments) => {
                        this.logger.debug('performances created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    });
                });
            });
        });
    }
    calculateStatuses() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Performance.find({}, 'day start_time screen').populate('screen', 'sections')
            .exec((err, performanceDocuments) => {
            let promises = [];
            let now = moment().format('YYYYMMDDHHmm');
            let performanceStatusesModel = new PerformanceStatusesModel_1.default();
            performanceDocuments.forEach((performanceDocument) => {
                // パフォーマンスごとに空席割合を算出する
                promises.push(new Promise((resolve, reject) => {
                    Models_1.default.Reservation.count({
                        performance: performanceDocument.get('_id')
                    }, (err, reservationCount) => {
                        if (err) {
                        }
                        else {
                            console.log(reservationCount);
                            let seatCount = performanceDocument.get('screen').get('sections')[0].seats.length;
                            let start = performanceDocument.get('day') + performanceDocument.get('start_time');
                            let status = PerformanceUtil_1.default.seatNum2status(reservationCount, seatCount, start, now);
                            performanceStatusesModel.setStatus(performanceDocument.get('_id'), status);
                        }
                        resolve();
                    });
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
