"use strict";
const BaseController_1 = require('../BaseController');
const Constants_1 = require('../../../common/Util/Constants');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const moment = require('moment');
const conf = require('config');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const sendgrid = require('sendgrid');
const emailTemplates = require('email-templates');
let MONGOLAB_URI = conf.get('mongolab_uri');
class TestController extends BaseController_1.default {
    /**
     * 仮予約ステータスで、一定時間過ぎた予約を空席にする
     */
    removeTemporaryReservations() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('updating temporary reservations...');
        Models_1.default.Reservation.remove({
            status: ReservationUtil_1.default.STATUS_TEMPORARY,
            updated_at: {
                $lt: moment().add(-10, 'minutes').toISOString()
            },
        }, (err) => {
            mongoose.disconnect();
            // 失敗しても、次のタスクにまかせる(気にしない)
            if (err) {
            }
            else {
            }
            process.exit(0);
        });
    }
    shuffle(array) {
        let m = array.length, t, i;
        // While there remain elements to shuffle…
        while (m) {
            // Pick a remaining element…
            i = Math.floor(Math.random() * m--);
            // And swap it with the current element.
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }
    /**
     * 予約を初期化する
     */
    resetReservations() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Reservation.remove({}, (err) => {
            this.logger.info('remove processed.', err);
            mongoose.disconnect();
            process.exit(0);
        });
    }
    /**
     * 固定日時を経過したら、空席ステータスにするバッチ
     */
    releaseSeatsKeptByMembers() {
        let now = moment();
        if (moment(Constants_1.default.RESERVE_END_DATETIME) < now) {
            mongoose.connect(MONGOLAB_URI, {});
            this.logger.info('releasing reservations kept by members...');
            Models_1.default.Reservation.remove({
                status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER
            }, (err) => {
                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                }
                else {
                }
                mongoose.disconnect();
                process.exit(0);
            });
        }
        else {
            process.exit(0);
        }
    }
    /**
     * 予約完了メールを送信する
     */
    sendCompleteEmail() {
        mongoose.connect(MONGOLAB_URI, {});
        let promises = [];
        this.logger.info('finding reservationEmailCues...');
        Models_1.default.ReservationEmailCue.find({
            is_sent: false
        }).limit(1).exec((err, cues) => {
            this.logger.info('reservationEmailCues found.', err, cues);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            if (cues.length === 0) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            let _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
            let next = (i) => {
                if (i === cues.length) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                let cue = cues[i];
                // 予約ロガーを取得
                Util_1.default.getReservationLogger(cue.get('payment_no'), (err, logger) => {
                    if (err) {
                    }
                    else {
                        this.logger = logger;
                    }
                    // 送信
                    Models_1.default.Reservation.find({
                        payment_no: cue.get('payment_no'),
                        status: ReservationUtil_1.default.STATUS_RESERVED
                    }, (err, reservations) => {
                        this.logger.info('reservations for email found.', err, reservations.length);
                        if (err) {
                            i++;
                            next(i);
                        }
                        else {
                            if (reservations.length === 0) {
                                // 送信済みフラグを立てる
                                this.logger.info('setting is_sent to true...');
                                cue.set('is_sent', true);
                                cue.save((err, res) => {
                                    this.logger.info('cue saved.');
                                    i++;
                                    next(i);
                                });
                            }
                            else {
                                let to = '';
                                let purchaserGroup = reservations[0].get('purchaser_group');
                                switch (purchaserGroup) {
                                    case ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER:
                                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                                    case ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR:
                                        to = reservations[0].get('purchaser_email');
                                        break;
                                    case ReservationUtil_1.default.PURCHASER_GROUP_STAFF:
                                        to = reservations[0].get('staff_email');
                                        break;
                                    default:
                                        break;
                                }
                                this.logger.info('to is', to);
                                if (!to) {
                                    // 送信済みフラグを立てる
                                    this.logger.info('setting is_sent to true...');
                                    cue.set('is_sent', true);
                                    cue.save((err, res) => {
                                        this.logger.info('cue saved.');
                                        i++;
                                        next(i);
                                    });
                                }
                                else {
                                    let EmailTemplate = emailTemplates.EmailTemplate;
                                    let dir = `${__dirname}/../../views/email/reserveComplete`;
                                    let template = new EmailTemplate(dir);
                                    let locals = {
                                        reservations: reservations
                                    };
                                    this.logger.info('rendering template...dir:', dir);
                                    template.render(locals, (err, result) => {
                                        this.logger.info('email template rendered.', err);
                                        if (err) {
                                            i++;
                                            next(i);
                                        }
                                        else {
                                            let email = new _sendgrid.Email({
                                                to: to,
                                                from: 'noreply@devtiffwebapp.azurewebsites.net',
                                                subject: `[TIFF][${process.env.NODE_ENV}] 予約完了`,
                                                // html: result.html
                                                text: result.text
                                            });
                                            // add barcodes
                                            for (let reservation of reservations) {
                                                let reservationId = reservation.get('_id').toString();
                                                email.addFile({
                                                    filename: `QR_${reservationId}.png`,
                                                    contentType: 'image/png',
                                                    cid: `qrcode_${reservationId}`,
                                                    content: ReservationUtil_1.default.createQRCode(reservationId)
                                                });
                                            }
                                            this.logger.info('sending an email...email:', email);
                                            _sendgrid.send(email, (err, json) => {
                                                this.logger.info('an email sent.', err, json);
                                                if (err) {
                                                    i++;
                                                    next(i);
                                                }
                                                else {
                                                    // 送信済みフラグを立てる
                                                    this.logger.info('setting is_sent to true...');
                                                    cue.set('is_sent', true);
                                                    cue.save((err, res) => {
                                                        this.logger.info('cue saved.');
                                                        i++;
                                                        next(i);
                                                    });
                                                }
                                            });
                                        }
                                    });
                                }
                            }
                        }
                    });
                });
            };
            let i = 0;
            next(i);
        });
    }
    upsertReservation() {
        mongoose.connect(MONGOLAB_URI, {});
        let promises = [];
        for (let i = 0; i < 3; i++) {
            promises.push(new Promise((resolve, reject) => {
                this.logger.debug('updating reservation...');
                Models_1.default.Reservation.findOneAndUpdate({
                    performance: "57a7c71e59e0a513283e0507",
                    seat_code: "A-2"
                }, {
                    $set: {
                        status: ReservationUtil_1.default.STATUS_TEMPORARY
                    },
                    $setOnInsert: {}
                }, {
                    upsert: true,
                    new: true
                }, (err, reservationDocument) => {
                    this.logger.debug('reservation updated.', err, reservationDocument);
                    resolve();
                });
            }));
        }
        Promise.all(promises).then(() => {
            mongoose.disconnect();
            process.exit(0);
        }, (err) => {
        });
    }
    createIndexes() {
        let MongoClient = mongodb.MongoClient;
        MongoClient.connect(conf.get('mongolab_uri'), (err, db) => {
            let promises = [];
            promises.push(new Promise((resolve, reject) => {
                db.collection('reservations').createIndex({
                    performance: 1,
                    seat_code: 1
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('reservation_email_cues').createIndex({
                    payment_no: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('staffs').createIndex({
                    user_id: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('sponsors').createIndex({
                    user_id: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('window').createIndex({
                    user_id: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('tel_staffs').createIndex({
                    user_id: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
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
    createSponsors() {
        mongoose.connect(MONGOLAB_URI, {});
        let password_salt = Util_1.default.createToken();
        Models_1.default.Sponsor.create({
            user_id: 'motionpicture',
            password_salt: password_salt,
            password_hash: Util_1.default.createHash('password', password_salt),
            name: 'モーションピクチャーというスポンサー',
            max_reservation_count: 50,
            performance: '57a3d45ddfada98420a623b2'
        }, () => {
            mongoose.disconnect();
            process.exit(0);
        });
    }
    createWindows() {
        mongoose.connect(MONGOLAB_URI, {});
        let password_salt = Util_1.default.createToken();
        Models_1.default.Window.create({
            user_id: 'motionpicture',
            password_salt: password_salt,
            password_hash: Util_1.default.createHash('12345', password_salt),
            name: '当日窓口モーションピクチャー'
        }, () => {
            mongoose.disconnect();
            process.exit(0);
        });
    }
    createTelStaffs() {
        mongoose.connect(MONGOLAB_URI, {});
        let password_salt = Util_1.default.createToken();
        Models_1.default.TelStaff.create({
            user_id: 'motionpicture',
            password_salt: password_salt,
            password_hash: Util_1.default.createHash('12345', password_salt),
            name: '電話窓口モーションピクチャー'
        }, () => {
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
