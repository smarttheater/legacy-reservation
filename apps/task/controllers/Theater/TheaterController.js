"use strict";
const BaseController_1 = require("../BaseController");
const Models_1 = require("../../../common/models/Models");
const ScreenUtil_1 = require("../../../common/models/Screen/ScreenUtil");
const conf = require("config");
const mongoose = require("mongoose");
const fs = require("fs-extra");
let MONGOLAB_URI = conf.get('mongolab_uri');
class TheaterController extends BaseController_1.default {
    createScreensFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/screens.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let screens = JSON.parse(data);
            let promises = screens.map((screen) => {
                // 座席数情報を追加
                screen.seats_number = screen.sections[0].seats.length;
                // 座席グレードごとの座席数情報を追加
                let seatsNumbersBySeatCode = {};
                seatsNumbersBySeatCode[ScreenUtil_1.default.SEAT_GRADE_CODE_NORMAL] = 0;
                seatsNumbersBySeatCode[ScreenUtil_1.default.SEAT_GRADE_CODE_PREMIERE_BOX] = 0;
                seatsNumbersBySeatCode[ScreenUtil_1.default.SEAT_GRADE_CODE_PREMIERE_LUXURY] = 0;
                seatsNumbersBySeatCode[ScreenUtil_1.default.SEAT_GRADE_CODE_FRONT_RECLINING] = 0;
                screen.sections[0].seats.forEach((seat) => {
                    seatsNumbersBySeatCode[seat.grade.code]++;
                });
                screen.seats_numbers_by_seat_grade = Object.keys(seatsNumbersBySeatCode).map((seatGradeCode) => {
                    return {
                        seat_grade_code: seatGradeCode,
                        seats_number: seatsNumbersBySeatCode[seatGradeCode],
                    };
                });
                return new Promise((resolve, reject) => {
                    this.logger.debug('updating screen...');
                    Models_1.default.Screen.findOneAndUpdate({
                        _id: screen._id
                    }, screen, {
                        new: true,
                        upsert: true
                    }, (err) => {
                        this.logger.debug('screen updated', err);
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
    }
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/theaters.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let theaters = JSON.parse(data);
            let promises = theaters.map((theater) => {
                return new Promise((resolve, reject) => {
                    this.logger.debug('updating theater...');
                    Models_1.default.Theater.findOneAndUpdate({
                        _id: theater._id
                    }, theater, {
                        new: true,
                        upsert: true
                    }, (err) => {
                        this.logger.debug('theater updated', err);
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
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TheaterController;
