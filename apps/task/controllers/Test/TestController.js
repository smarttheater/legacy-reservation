"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const mongoose = require('mongoose');
const conf = require('config');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const Util_1 = require('../../../common/Util/Util');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class TestController extends BaseController_1.default {
    checkIfExist() {
        mongoose.connect(MONGOLAB_URI, {});
        // MP確保スタッフを取得
        Models_1.default.Staff.findOne({
            user_id: "motionpicture_keep"
        }, (err, staff) => {
            let allReservations = [];
            // 抽出予約データファイルリスト
            fs.readdir(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCVS`, (err, files) => {
                let promises = files.map((file) => {
                    return new Promise((resolve, reject) => {
                        // json読み込み
                        this.logger.debug('reading file...', file);
                        fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCVS/${file}`, 'utf8', (err, data) => {
                            this.logger.debug('file read.', file);
                            let reservations = JSON.parse(data);
                            for (let resevation of reservations) {
                                allReservations.push(resevation);
                            }
                            resolve();
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    console.log(allReservations.length);
                    let promises = allReservations.map((reservation) => {
                        return new Promise((resolve, reject) => {
                            this.logger.debug('finding reservation', reservation.performance, reservation.seat_code);
                            Models_1.default.Reservation.findOne({
                                performance: reservation.performance,
                                seat_code: reservation.seat_code,
                            }, (err, reservationDocument) => {
                                this.logger.debug('reservation found.', err, (reservationDocument) ? reservationDocument.get('status') : null);
                                if (err)
                                    return reject(err);
                                if (reservationDocument) {
                                    this.logger.debug('payment_no ok?', (reservationDocument.get('payment_no') === reservation.payment_no));
                                    return resolve();
                                }
                                let newReservation = {
                                    "performance": reservation.performance,
                                    "seat_code": reservation.seat_code,
                                    "status": ReservationUtil_1.default.STATUS_RESERVED,
                                    "staff": staff.get('_id'),
                                    "staff_user_id": staff.get('user_id'),
                                    "staff_email": staff.get('email'),
                                    "staff_name": staff.get('name'),
                                    "staff_signature": "system",
                                    "entered": false,
                                    "updated_user": "system",
                                    "purchased_at": Date.now(),
                                    "watcher_name_updated_at": null,
                                    "watcher_name": "",
                                    "film_copyright": reservation.film_copyright,
                                    "film_is_mx4d": reservation.film_is_mx4d,
                                    "film_image": reservation.film_image,
                                    "film_name_en": reservation.film_name_en,
                                    "film_name_ja": reservation.film_name_ja,
                                    "film": reservation.film,
                                    "screen_name_en": reservation.screen_name_en,
                                    "screen_name_ja": reservation.screen_name_ja,
                                    "screen": reservation.screen,
                                    "theater_name_en": reservation.theater_name_en,
                                    "theater_name_ja": reservation.theater_name_ja,
                                    "theater_address_en": reservation.theater_address_en,
                                    "theater_address_ja": reservation.theater_address_ja,
                                    "theater": reservation.theater,
                                    "performance_canceled": reservation.performance_canceled,
                                    "performance_end_time": reservation.performance_end_time,
                                    "performance_start_time": reservation.performance_start_time,
                                    "performance_open_time": reservation.performance_open_time,
                                    "performance_day": reservation.performance_day,
                                    "purchaser_group": ReservationUtil_1.default.PURCHASER_GROUP_STAFF,
                                    "payment_no": reservation.payment_no,
                                    "payment_seat_index": reservation.payment_seat_index,
                                    "charge": 0,
                                    "ticket_type_charge": 0,
                                    "ticket_type_name_en": "Free",
                                    "ticket_type_name_ja": "無料",
                                    "ticket_type_code": "00",
                                    "seat_grade_additional_charge": 0,
                                    "seat_grade_name_en": "Normal Seat",
                                    "seat_grade_name_ja": "ノーマルシート"
                                };
                                resolve();
                            });
                        });
                    });
                    Promise.all(promises).then(() => {
                        this.logger.info('promised.');
                        mongoose.disconnect();
                        process.exit(0);
                    }).catch((err) => {
                        this.logger.error('promised.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    });
                }).catch((err) => {
                    this.logger.error('promised.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    createReservationsFromLogs() {
        // fs.readFile(`${process.cwd()}/logs/gmoOrderIdsCredit.json`, 'utf8', (err, data) => {
        fs.readFile(`${process.cwd()}/logs/gmoOrderIdsCVS.json`, 'utf8', (err, data) => {
            let paymentNos = JSON.parse(data);
            console.log(paymentNos.length);
            let promises = paymentNos.map((paymentNo) => {
                return new Promise((resolve, reject) => {
                    fs.readFile(`${process.cwd()}/logs/reservationsGmoError/${paymentNo[paymentNo.length - 1]}/${paymentNo}.log`, 'utf8', (err, data) => {
                        this.logger.info('log found', err);
                        if (err)
                            return resolve();
                        // let pattern = /\[(.+)] \[INFO] reservation - updating reservation all infos...update: { _id: '(.+)',\n  status: '(.+)',\n  seat_code: '(.+)',\n  seat_grade_name_ja: '(.+)',\n  seat_grade_name_en: '(.+)',\n  seat_grade_additional_charge: (.+),\n  ticket_type_code: '(.+)',\n  ticket_type_name_ja: '(.+)',\n  ticket_type_name_en: '(.+)',\n  ticket_type_charge: (.+),\n  charge: (.+),\n  payment_no: '(.+)',\n  purchaser_group: '(.+)',\n  performance: '(.+)',\n/;
                        let pattern = /reservation - updating reservation all infos...update: {[^}]+}/g;
                        let matches = data.match(pattern);
                        let json = '[\n';
                        if (matches) {
                            matches.forEach((match, index) => {
                                json += (index > 0) ? ',\n' : '';
                                let reservation = match.replace('reservation - updating reservation all infos...update: ', '')
                                    .replace(/"/g, '\\"')
                                    .replace(/ _id:/g, '"_id":')
                                    .replace(/  ([a-z_]+[a-z0-9_]+):/g, '"$1":')
                                    .replace(/: '/g, ': "')
                                    .replace(/',/g, '",')
                                    .replace(/\\'/g, '\'');
                                json += reservation;
                            });
                        }
                        json += '\n]';
                        this.logger.info('writing json...');
                        // fs.writeFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCredit/${paymentNo}.json`, json, 'utf8', (err) => {
                        fs.writeFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCVS/${paymentNo}.json`, json, 'utf8', (err) => {
                            this.logger.info('json written', err);
                            (err) ? reject(err) : resolve();
                        });
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                process.exit(0);
            }).catch((err) => {
                this.logger.error('promised.', err);
                process.exit(0);
            });
        });
    }
    publishPaymentNo() {
        mongoose.connect(MONGOLAB_URI, {});
        ReservationUtil_1.default.publishPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }
    checkFullWidthLetter() {
        let filmName = '作家性の萌芽　1999-2003 （細田守監督短編集）『劇場版デジモンアドベンチャー』『劇場版デジモンアドベンチャー　ぼくらのウォーゲーム！』『村上隆作品　SUPERFLAT MONOGRAM』『村上隆作品　The Creatures From Planet 66 ～Roppongi Hills Story～』『おジャ魔女どれみドッカ～ン！（40話）』『明日のナージャ（OP、ED）』';
        let filmNameFullWidth = Util_1.default.toFullWidth(filmName);
        let registerDisp1 = '';
        for (let i = 0; i < filmNameFullWidth.length; i++) {
            let letter = filmNameFullWidth[i];
            if (letter.match(/[Ａ-Ｚａ-ｚ０-９]/)
                || letter.match(/[\u3040-\u309F]/) // ひらがな
                || letter.match(/[\u30A0-\u30FF]/) // カタカナ
                || letter.match(/[一-龠]/) // 漢字
            ) {
                registerDisp1 += letter;
            }
        }
        console.log(registerDisp1);
        process.exit(0);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
