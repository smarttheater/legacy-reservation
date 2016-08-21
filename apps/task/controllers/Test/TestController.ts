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
import mongodb = require('mongodb');
import mongoose = require('mongoose');
import PerformanceStatusesModel from '../../../common/models/PerformanceStatusesModel';
import request = require('request');
import sendgrid = require('sendgrid')
import emailTemplates = require('email-templates');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class TestController extends BaseController {
    /**
     * 予約を初期化する
     */
    public resetReservations(): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Reservation.remove({}, (err) => {
            this.logger.info('remove processed.', err);

            mongoose.disconnect();
            process.exit(0);
        });
    }

    public upsertReservation(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let promises = [];

        for (let i = 0; i < 3; i++) {
            promises.push(new Promise((resolve, reject) => {
                this.logger.debug('updating reservation...');
                Models.Reservation.findOneAndUpdate(
                    {
                        performance: "57a7c71e59e0a513283e0507",
                        seat_code: "A-2"
                    },
                    {
                        $set: {
                            status: ReservationUtil.STATUS_TEMPORARY
                        },
                        $setOnInsert: {
                        }
                    },
                    {
                        upsert: true,
                        new: true
                    },
                    (err, reservationDocument) => {
                        this.logger.debug('reservation updated.', err, reservationDocument);

                        resolve();

                    }
                );
            }));
        }


        Promise.all(promises).then(() => {
            mongoose.disconnect();
            process.exit(0);

        }, (err) => {

        });
    }

    public createIndexes() {
        let MongoClient = mongodb.MongoClient;
        MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
            let promises = [];

            promises.push(new Promise((resolve, reject) => {
                db.collection('reservations').createIndex(
                    {
                        performance: 1,
                        seat_code: 1
                    },
                    {
                        unique: true
                    },
                    (err) => {
                        this.logger.debug('index created.', err);
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('reservation_email_cues').createIndex(
                    {
                        payment_no: 1,
                    },
                    {
                        unique: true
                    },
                    (err) => {
                        this.logger.debug('index created.', err);
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('staffs').createIndex(
                    {
                        user_id: 1,
                    },
                    {
                        unique: true
                    },
                    (err) => {
                        this.logger.debug('index created.', err);
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('sponsors').createIndex(
                    {
                        user_id: 1,
                    },
                    {
                        unique: true
                    },
                    (err) => {
                        this.logger.debug('index created.', err);
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('window').createIndex(
                    {
                        user_id: 1,
                    },
                    {
                        unique: true
                    },
                    (err) => {
                        this.logger.debug('index created.', err);
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            }));

            promises.push(new Promise((resolve, reject) => {
                db.collection('tel_staffs').createIndex(
                    {
                        user_id: 1,
                    },
                    {
                        unique: true
                    },
                    (err) => {
                        this.logger.debug('index created.', err);
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            }));



            Promise.all(promises).then(() => {
                this.logger.debug('success!');
                db.close();
                process.exit(0);

            }, (err) => {
                db.close();
                process.exit(0);

            });
        });
    }

    public createSponsors(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let password_salt = Util.createToken();
        Models.Sponsor.create(
            {
                user_id: 'motionpicture',
                password_salt: password_salt,
                password_hash: Util.createHash('password', password_salt),
                name: 'モーションピクチャーというスポンサー',
                max_reservation_count: 50,
                performance: '57a3d45ddfada98420a623b2'
            },
            () => {
                mongoose.disconnect();
                process.exit(0);
            }
        );
    }

    public createWindows(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let password_salt = Util.createToken();
        Models.Window.create(
            {
                user_id: 'motionpicture',
                password_salt: password_salt,
                password_hash: Util.createHash('12345', password_salt),
                name: '当日窓口モーションピクチャー'
            },
            () => {
                mongoose.disconnect();
                process.exit(0);
            }
        );
    }

    public createTelStaffs(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let password_salt = Util.createToken();
        Models.TelStaff.create(
            {
                user_id: 'motionpicture',
                password_salt: password_salt,
                password_hash: Util.createHash('12345', password_salt),
                name: '電話窓口モーションピクチャー'
            },
            () => {
                mongoose.disconnect();
                process.exit(0);
            }
        );
    }
}
