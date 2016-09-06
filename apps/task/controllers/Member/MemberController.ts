import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import moment = require('moment');
import conf = require('config');
import mongoose = require('mongoose');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class MemberController extends BaseController {
    public createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/members.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let members = JSON.parse(data);

            // パスワードハッシュ化
            members = members.map((member) => {
                let password_salt = Util.createToken();
                return {
                    "user_id": member.user_id,
                    "password_salt": password_salt,
                    "password_hash": Util.createHash(member.password, password_salt)
                };
            });
            this.logger.info('removing all members...');
            Models.Member.remove({}, (err) => {
                this.logger.debug('creating members...');
                Models.Member.create(
                    members,
                    (err) => {
                        this.logger.info('members created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createReservationsFromJson() {
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
            "_id": `${moment(conf.get<string>('datetimes.event_start')).format('YYYYMMDD')}001070600`,
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
            "day": moment(conf.get<string>('datetimes.event_start')).format('YYYYMMDD'),
            "open_time": "0750",
            "start_time": "0800",
            "end_time": "0900"
        };

        Models.Film.create(film, (err) => {
            Models.Performance.create(performance, (err) => {
                fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/memberReservations.json`, 'utf8', (err, data) => {
                    if (err) throw err;
                    let reservations = JSON.parse(data);

                    reservations = reservations.map((reservation) => {
                        reservation.performance = performance._id;
                        return reservation;
                    });

                    this.logger.debug('creating reservations...');
                    Models.Reservation.create(
                        reservations,
                        (err) => {
                            this.logger.info('reservations created.', err);
                            mongoose.disconnect();
                            process.exit(0);
                        }
                    );
                });
            });
        });
    }
}
