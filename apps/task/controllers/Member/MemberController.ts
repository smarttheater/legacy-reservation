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

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class MemberController extends BaseController {
    public createAll() {
        let promises = [];
        mongoose.connect(MONGOLAB_URI, {});

        Models.Member.remove((err) => {
            for (let i=0; i<50; i++) {
                promises.push(new Promise((resolve, reject) => {
                    Models.Member.create(
                        {
                            user_id: ('000' + i).slice(-3),
                            password: '12345'
                        },
                        (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
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

    public createReservations() {
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

        Models.Film.create(film, (err) => {
            Models.Performance.create(performance, (err) => {

                Models.Performance.findById(performance._id).populate('screen').exec((err, performance) => {
                    let seats = performance.get('screen').sections[0].seats;

                    Models.Member.find({}, (err, members) => {
                        // 会員ごとに2席ずつ予約確保

                        let reservations = [];

                        for (let i=0; i<members.length; i++) {
                            reservations.push(
                                {
                                    performance: performance.get('_id'),
                                    seat_code: seats[i * 2].code,
                                    // payment_no: paymentNo,
                                    purchaser_group: ReservationUtil.PURCHASER_GROUP_MEMBER,
                                    status: ReservationUtil.STATUS_KEPT_BY_MEMBER,
                                    member: members[i].get('_id')
                                },
                                {
                                    performance: performance.get('_id'),
                                    seat_code: seats[(i * 2) + 1].code,
                                    // payment_no: paymentNo,
                                    purchaser_group: ReservationUtil.PURCHASER_GROUP_MEMBER,
                                    status: ReservationUtil.STATUS_KEPT_BY_MEMBER,
                                    member: members[i].get('_id')
                                }
                            );
                        }

                        for (let i=0; i<reservations.length / 2; i++) {
                            promises.push(new Promise((resolve, reject) => {
                                // 購入番号を発行
                                Models.Sequence.findOneAndUpdate(
                                    {
                                        target: 'payment_no'
                                    },
                                    {
                                        $inc: {
                                            no: 1
                                        }
                                    },
                                    {
                                        new: true
                                    },
                                    (err, sequenceDocument) => {
                                        if (err) {
                                            mongoose.disconnect();
                                            process.exit(0);

                                        } else {
                                            let no: number = sequenceDocument.get('no');
                                            let paymentNo = `${no}${Util.getCheckDigit(no)}`;

                                            let newReservation1 = reservations[i * 2];
                                            let newReservation2 = reservations[(i * 2) + 1];
                                            newReservation1['payment_no'] = paymentNo;
                                            newReservation2['payment_no'] = paymentNo;

                                            Models.Reservation.create(newReservation1, newReservation2, (err, reservation1, reservation2) => {
                                                this.logger.debug('reservations created.', err);
                                                if (err) {
                                                    reject(err);
                                                } else {
                                                    resolve();
                                                }
                                            })
                                        }
                                    }
                                );
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
