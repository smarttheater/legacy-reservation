"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const conf = require('config');
const mongoose = require('mongoose');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class PreTiffController extends BaseController_1.default {
    /**
     * パフォーマンスを初期化する
     */
    createPerformances() {
        mongoose.connect(MONGOLAB_URI, {});
        let performances = [];
        // 作品ごとのパフォーマンス数(最大3つになるように制御)
        let performancesByFilm = {};
        Models_1.default.Film.find({}, '_id', (err, filmDocuments) => {
            Models_1.default.Screen.findOne({}, '_id theater', (err, screenDocument) => {
                let days = ['20160905'];
                let starts = ['1500'];
                let ends = ['1700'];
                // スクリーンごとに4時間帯のスケジュールを登録する
                this.logger.debug('performances length:', performances.length);
                days.forEach((day) => {
                    starts.forEach((start, index) => {
                        // 作品を選考する
                        this.logger.debug('selecting film...');
                        let _filmId;
                        while (_filmId === undefined) {
                            let _filmDocuments = this.shuffle(filmDocuments);
                            let _film = _filmDocuments[0];
                            if (performancesByFilm.hasOwnProperty(_film.get('_id'))) {
                                if (performancesByFilm[_film.get('_id')].length > 2) {
                                    continue;
                                }
                                else {
                                    performancesByFilm[_film.get('_id')].push('performance');
                                    _filmId = _film.get('_id');
                                }
                            }
                            else {
                                performancesByFilm[_film.get('_id')] = [];
                                performancesByFilm[_film.get('_id')].push('performance');
                                _filmId = _film.get('_id');
                            }
                        }
                        this.logger.debug('pushing performance...');
                        performances.push({
                            theater: screenDocument.get('theater'),
                            screen: screenDocument.get('_id'),
                            film: _filmId,
                            day: day,
                            start_time: start,
                            end_time: ends[index],
                            is_mx4d: this.shuffle([true, false, false, false])[0]
                        });
                    });
                });
                // 全削除して一気に作成
                this.logger.debug('removing all performances...');
                Models_1.default.Performance.remove({}, (err) => {
                    this.logger.debug('creating performances...');
                    Models_1.default.Performance.create(performances, (err, performanceDocuments) => {
                        this.logger.debug('performances created.');
                        mongoose.disconnect();
                        if (err) {
                        }
                        else {
                        }
                        this.logger.debug('success!');
                        process.exit(0);
                    });
                });
            });
        });
    }
    createQRCodes() {
        mongoose.connect(MONGOLAB_URI, {});
        let promises = [];
        Models_1.default.Reservation.find({})
            .exec((err, reservationDocuments) => {
            for (let reservationDocument of reservationDocuments) {
                promises.push(new Promise((resolve, reject) => {
                    let qr = Util_1.default.createQRCode(reservationDocument.get('_id').toString());
                    let filename = `${__dirname}/../../../../logs/pretiff/qr/${reservationDocument.get('seat_code')}.png`;
                    fs.writeFile(filename, qr, (err) => {
                        resolve();
                    });
                }));
            }
            Promise.all(promises).then(() => {
                mongoose.disconnect();
                this.logger.debug('success!');
                process.exit(0);
            }, (err) => {
                mongoose.disconnect();
                this.logger.debug('fail.');
                process.exit(0);
            });
        });
    }
    reservation2reserved() {
        let ticketChoices = [
            {
                "ticket_type_charge": 2000,
                "ticket_type_name_en": "Adults",
                "ticket_type_name_ja": "一般",
                "ticket_type_code": "01"
            },
            {
                "ticket_type_charge": 1500,
                "ticket_type_name_en": "Students",
                "ticket_type_name_ja": "学生",
                "ticket_type_code": "02"
            }
        ];
        let update = {
            "performance": "20160905000001011500",
            "status": "RESERVED",
            "updated_user": "system",
            "payment_method": "0",
            "purchaser_tel": "09012345678",
            "purchaser_email": "ilovegadd@gmail.com",
            "purchaser_first_name": "ヤマザキ",
            "purchaser_last_name": "テツ",
            "film_image": "http://livedoor.4.blogimg.jp/jin115/imgs/0/d/0d48af82.jpg",
            "film_name_en": "SHIN GODZILLA / JAPANESE",
            "film_name_ja": "シン・ゴジラ",
            "film": "000001",
            "film_is_mx4d": false,
            "screen_name_en": "SCREEN01",
            "screen_name_ja": "スクリーン01",
            "screen": "00000101",
            "theater_name_en": "TOHO CINEMAS Roppongi Hills",
            "theater_name_ja": "TOHOシネマズ 六本木ヒルズ",
            "theater": "000001",
            "performance_end_time": "1500",
            "performance_start_time": "1700",
            "performance_day": "20160905",
            "purchaser_group": "01",
            "payment_no": "1111115945",
            "charge": 5000,
            "total_charge": 17000,
            "purchased_at": Date.now(),
            "gmo_status": "CAPTURE",
            "gmo_pay_type": "0",
            "gmo_tran_date": "20160819121712",
            "gmo_tran_id": "1608191217111111111111879193",
            "gmo_approve": "7764440",
            "gmo_method": "1",
            "gmo_forward": "2a99662",
            "gmo_access_id": "5ddc13f90bff5251aff95534ea35dc0b",
            "gmo_tax": "0",
            "gmo_amount": "17000",
            "gmo_shop_id": "tshop00024015"
        };
        mongoose.connect(MONGOLAB_URI, {});
        let promises = [];
        Models_1.default.Reservation.find({}, '_id')
            .exec((err, reservations) => {
            let ticketType = this.shuffle(ticketChoices)[0];
            update = Object.assign(ticketType, update);
            for (let reservation of reservations) {
                promises.push(new Promise((resolve, reject) => {
                    reservation.update(update, (err, raw) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }));
            }
            Promise.all(promises).then(() => {
                mongoose.disconnect();
                this.logger.debug('success!');
                process.exit(0);
            }, (err) => {
                mongoose.disconnect();
                this.logger.debug('fail.');
                process.exit(0);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreTiffController;
