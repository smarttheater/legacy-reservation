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
                let days = [];
                let start = moment(conf.get('datetimes.event_start'));
                let end = moment(conf.get('datetimes.event_end'));
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
                                open_time: opens[index],
                                start_time: start,
                                end_time: ends[index]
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
    /**
     * 空席ステータスを更新する
     */
    updateStatuses() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('finding performances...');
        Models_1.default.Performance.find({}, 'day start_time screen').populate('screen', 'sections')
            .exec((err, performances) => {
            this.logger.info('performances found.', err);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            let promises = [];
            let now = moment().format('YYYYMMDDHHmm');
            let performanceStatusesModel = new PerformanceStatusesModel_1.default();
            performances.forEach((performance) => {
                // パフォーマンスごとに空席割合を算出する
                promises.push(new Promise((resolve, reject) => {
                    Models_1.default.Reservation.count({
                        performance: performance.get('_id')
                    }, (err, reservationCount) => {
                        if (err) {
                            // エラーしても無視して次のタスクにまかせる
                            // reject(err);
                            performanceStatusesModel.setStatus(performance.get('_id').toString(), '?');
                        }
                        else {
                            let seatCount = performance.get('screen').get('sections')[0].seats.length;
                            let start = performance.get('day') + performance.get('start_time');
                            let status = PerformanceUtil_1.default.seatNum2status(reservationCount, seatCount, start, now);
                            performanceStatusesModel.setStatus(performance.get('_id').toString(), status);
                        }
                        resolve();
                    });
                }));
            });
            Promise.all(promises).then(() => {
                this.logger.info('promises completed.');
                performanceStatusesModel.save((err) => {
                    mongoose.disconnect();
                    process.exit(0);
                });
            }, (err) => {
                this.logger.error('promises completed.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
