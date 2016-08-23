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
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class TestController extends BaseController {
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

    public createWindows(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/windows.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let windows = JSON.parse(data);

            // パスワードハッシュ化
            windows = windows.map((window) => {
                let password_salt = Util.createToken();
                window['password_salt'] = password_salt;
                window['password_hash'] = Util.createHash(window.password, password_salt);
                delete window['password'];
                return window;
            });
            this.logger.info('removing all windows...');
            Models.Window.remove({}, (err) => {
                this.logger.debug('creating windows...');
                Models.Window.create(
                    windows,
                    (err) => {
                        this.logger.info('windows created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    public createTelStaffs(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/telStaffs.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let telStaffs = JSON.parse(data);

            // パスワードハッシュ化
            telStaffs = telStaffs.map((telStaff) => {
                let password_salt = Util.createToken();
                telStaff['password_salt'] = password_salt;
                telStaff['password_hash'] = Util.createHash(telStaff.password, password_salt);
                delete telStaff['password'];
                return telStaff;
            });
            this.logger.info('removing all telStaffs...');
            Models.TelStaff.remove({}, (err) => {
                this.logger.debug('creating telStaffs...');
                Models.TelStaff.create(
                    telStaffs,
                    (err) => {
                        this.logger.info('telStaffs created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }
}
