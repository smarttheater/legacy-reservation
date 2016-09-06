"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const moment = require('moment');
const conf = require('config');
const mongoose = require('mongoose');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class MemberController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/members.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let members = JSON.parse(data);
            // パスワードハッシュ化
            members = members.map((member) => {
                let password_salt = Util_1.default.createToken();
                return {
                    "user_id": member.user_id,
                    "password_salt": password_salt,
                    "password_hash": Util_1.default.createHash(member.password, password_salt)
                };
            });
            this.logger.info('removing all members...');
            Models_1.default.Member.remove({}, (err) => {
                this.logger.debug('creating members...');
                Models_1.default.Member.create(members, (err) => {
                    this.logger.info('members created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    createReservationsFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        let film = {
            "_id": "999999",
            "name": {
                "ja": "メルマガ会員先行予約用の作品",
                "en": "Film for Email Members",
            },
            "ticket_type_group": "01",
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
            "_id": `${moment(conf.get('datetimes.event_start')).format('YYYYMMDD')}001070600`,
            "theater": "001",
            "theater_name": {
                "ja": "TOHOシネマズ 六本木ヒルズ",
                "en": "TOHO CINEMAS Roppongi Hills"
            },
            "screen": "00107",
            "screen_name": {
                "ja": "スクリーン07",
                "en": "Screen07"
            },
            "film": "999999",
            "day": moment(conf.get('datetimes.event_start')).format('YYYYMMDD'),
            "open_time": "0750",
            "start_time": "0800",
            "end_time": "0900"
        };
        Models_1.default.Film.create(film, (err) => {
            Models_1.default.Performance.create(performance, (err) => {
                fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/memberReservations.json`, 'utf8', (err, data) => {
                    if (err)
                        throw err;
                    let reservations = JSON.parse(data);
                    reservations = reservations.map((reservation) => {
                        reservation.performance = performance._id;
                        return reservation;
                    });
                    this.logger.debug('creating reservations...');
                    Models_1.default.Reservation.create(reservations, (err) => {
                        this.logger.info('reservations created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    });
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberController;
