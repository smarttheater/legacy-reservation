"use strict";
const BaseController_1 = require("../BaseController");
const Models_1 = require("../../../common/models/Models");
const moment = require("moment");
const conf = require("config");
const mongoose = require("mongoose");
const fs = require("fs-extra");
const PerformanceStatusesModel_1 = require("../../../common/models/PerformanceStatusesModel");
let MONGOLAB_URI = conf.get('mongolab_uri');
class PerformanceController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/performances.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let performances = JSON.parse(data);
            Models_1.default.Screen.find({}, 'name theater').populate('theater', 'name').exec((err, screens) => {
                // あれば更新、なければ追加
                let promises = performances.map((performance) => {
                    // 劇場とスクリーン名称を追加
                    let _screen = screens.find((screen) => {
                        return (screen.get('_id').toString() === performance.screen);
                    });
                    performance.screen_name = _screen.get('name');
                    performance.theater_name = _screen.get('theater').get('name');
                    return new Promise((resolve, reject) => {
                        this.logger.debug('updating performance...');
                        Models_1.default.Performance.findOneAndUpdate({ _id: performance._id }, performance, {
                            new: true,
                            upsert: true
                        }, (err) => {
                            this.logger.debug('performance updated', err);
                            (err) ? reject(err) : resolve();
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    this.logger.info('promised.');
                    mongoose.disconnect();
                    process.exit(0);
                }, (err) => {
                    this.logger.error('promised.', err);
                    mongoose.disconnect();
                    process.exit(0);
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
        Models_1.default.Performance.find({}, 'day start_time screen')
            .populate('screen', 'seats_number')
            .exec((err, performances) => {
            this.logger.info('performances found.', err);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            let now = parseInt(moment().format('YYYYMMDDHHmm'));
            let performanceStatusesModel = new PerformanceStatusesModel_1.default();
            this.logger.info('aggregating...');
            Models_1.default.Reservation.aggregate([
                {
                    $group: {
                        _id: "$performance",
                        count: { $sum: 1 }
                    }
                }
            ], (err, results) => {
                this.logger.info('aggregated.', err);
                if (err) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                // パフォーマンスIDごとに
                let reservationNumbers = {};
                for (let result of results) {
                    reservationNumbers[result._id] = parseInt(result.count);
                }
                performances.forEach((performance) => {
                    // パフォーマンスごとに空席ステータスを算出する
                    if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                        reservationNumbers[performance.get('_id').toString()] = 0;
                    }
                    let status = performance['getSeatStatus'](reservationNumbers[performance.get('_id').toString()]);
                    performanceStatusesModel.setStatus(performance._id.toString(), status);
                });
                this.logger.info('saving performanceStatusesModel...', performanceStatusesModel);
                performanceStatusesModel.save((err) => {
                    this.logger.info('performanceStatusesModel saved.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    /**
     * ID指定でパフォーマンスを公開する
     */
    release(performanceId) {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('updating performance..._id:', performanceId);
        Models_1.default.Performance.findOneAndUpdate({
            _id: performanceId
        }, {
            canceled: false
        }, {
            new: true,
        }, (err, performance) => {
            this.logger.info('performance updated', err, performance);
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
