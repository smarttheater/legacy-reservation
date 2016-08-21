"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const conf = require('config');
const mongoose = require('mongoose');
let MONGOLAB_URI = conf.get('mongolab_uri');
class MemberController extends BaseController_1.default {
    createAll() {
        let promises = [];
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Member.remove((err) => {
            for (let i = 0; i < 50; i++) {
                promises.push(new Promise((resolve, reject) => {
                    Models_1.default.Member.create({
                        user_id: ('000' + i).slice(-3),
                        password: '12345'
                    }, (err) => {
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
                this.logger.debug('success');
                mongoose.disconnect();
                process.exit(0);
            }, (err) => {
                this.logger.debug('err:', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
    createReservations() {
        let film = {
            "_id": "999999",
            "name": {
                "ja": "メルマガ会員先行予約用の作品",
                "en": "Film for Email Members",
            },
            "ticket_type_group": "001",
            "minutes": 99,
            "sections": [
                {
                    "code": "01",
                    "name": {
                        "ja": "オープニング",
                        "en": "Opening"
                    }
                }
            ],
            "image": "http://art33.photozou.jp/pub/794/3019794/photo/239721730.jpg",
            "is_mx4d": false
        };
        let performance = {
            "_id": "20161022000001010600",
            "theater": "000001",
            "screen": "00000101",
            "film": "999999",
            "day": "20161022",
            "start_time": "0600",
            "end_time": "0800"
        };
        let promises = [];
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Film.create(film, (err) => {
            Models_1.default.Performance.create(performance, (err) => {
                Models_1.default.Performance.findById(performance._id).populate('screen').exec((err, performance) => {
                    let seats = performance.get('screen').sections[0].seats;
                    Models_1.default.Member.find({}, (err, members) => {
                        // 会員ごとに2席ずつ予約確保
                        let reservations = [];
                        for (let i = 0; i < members.length; i++) {
                            reservations.push({
                                performance: performance.get('_id'),
                                seat_code: seats[i * 2].code,
                                // payment_no: paymentNo,
                                purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_MEMBER,
                                status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER,
                                member: members[i].get('_id')
                            }, {
                                performance: performance.get('_id'),
                                seat_code: seats[(i * 2) + 1].code,
                                // payment_no: paymentNo,
                                purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_MEMBER,
                                status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER,
                                member: members[i].get('_id')
                            });
                        }
                        for (let i = 0; i < reservations.length / 2; i++) {
                            promises.push(new Promise((resolve, reject) => {
                                // 購入番号を発行
                                Models_1.default.Sequence.findOneAndUpdate({
                                    target: 'payment_no'
                                }, {
                                    $inc: {
                                        no: 1
                                    }
                                }, {
                                    new: true
                                }, (err, sequenceDocument) => {
                                    if (err) {
                                        mongoose.disconnect();
                                        process.exit(0);
                                    }
                                    else {
                                        let no = sequenceDocument.get('no');
                                        let paymentNo = `${no}${Util_1.default.getCheckDigit(no)}`;
                                        let newReservation1 = reservations[i * 2];
                                        let newReservation2 = reservations[(i * 2) + 1];
                                        newReservation1['payment_no'] = paymentNo;
                                        newReservation2['payment_no'] = paymentNo;
                                        Models_1.default.Reservation.create(newReservation1, newReservation2, (err, reservation1, reservation2) => {
                                            this.logger.debug('reservations created.', err);
                                            if (err) {
                                                reject(err);
                                            }
                                            else {
                                                resolve();
                                            }
                                        });
                                    }
                                });
                            }));
                        }
                        Promise.all(promises).then(() => {
                            this.logger.debug('success');
                            mongoose.disconnect();
                            process.exit(0);
                        }, (err) => {
                            this.logger.debug('err:', err);
                            mongoose.disconnect();
                            process.exit(0);
                        });
                    });
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberController;
