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
     * 仮予約ステータスで、一定時間過ぎた予約を空席にする
     */
    public removeTemporaryReservations(): void {
        mongoose.connect(MONGOLAB_URI, {});

        this.logger.info('updating temporary reservations...');
        Models.Reservation.remove(
            {
                status: ReservationUtil.STATUS_TEMPORARY,
                updated_at: {
                    $lt: moment().add(-10, 'minutes').toISOString()
                },
            },
            (err) => {
                mongoose.disconnect();

                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                } else {
                }

                process.exit(0);
            }
        );
    }

    private shuffle(array) {
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
    public resetReservations(): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Reservation.remove({}, (err) => {
            this.logger.info('remove processed.', err);

            mongoose.disconnect();
            process.exit(0);
        });
    }

    /**
     * 固定日時を経過したら、空席ステータスにするバッチ
     */
    public releaseSeatsKeptByMembers() {
        let now = moment();
        if (moment(Constants.RESERVE_END_DATETIME) < now) {
            mongoose.connect(MONGOLAB_URI, {});

            this.logger.info('releasing reservations kept by members...');
            Models.Reservation.remove(
                {
                    status: ReservationUtil.STATUS_KEPT_BY_MEMBER
                },
                (err) => {
                    // 失敗しても、次のタスクにまかせる(気にしない)
                    if (err) {
                    } else {
                    }

                    mongoose.disconnect();
                    process.exit(0);
                }
            );
        } else {
            process.exit(0);            
        }
    }

    /**
     * 予約完了メールを送信する
     */
    public sendCompleteEmail(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let promises = [];

        this.logger.info('finding reservationEmailCues...');
        Models.ReservationEmailCue.find(
            {
                is_sent: false
            }
        ).limit(1).exec((err, cues) => {
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

            let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));

            let next = (i: number) => {
                if (i === cues.length) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;

                }

                let cue = cues[i];

                // 予約ロガーを取得
                Util.getReservationLogger(cue.get('payment_no'), (err, logger) => {
                    if (err) {
                        // 失敗したらデフォルトロガーに逃げる
                    } else {
                        this.logger = logger;
                    }

                    // 送信
                    Models.Reservation.find(
                        {
                            payment_no: cue.get('payment_no'),
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        (err, reservations) => {
                            this.logger.info('reservations for email found.', err, reservations.length);
                            if (err) {
                                i++;
                                next(i);
                            } else {
                                if (reservations.length === 0) {
                                    // 送信済みフラグを立てる
                                    this.logger.info('setting is_sent to true...');
                                    cue.set('is_sent', true);
                                    cue.save((err, res) => {
                                        this.logger.info('cue saved.');
                                        i++;
                                        next(i);
                                    });
                                } else {
                                    let to = '';
                                    let purchaserGroup = reservations[0].get('purchaser_group');
                                    switch (purchaserGroup) {
                                        case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                                        case ReservationUtil.PURCHASER_GROUP_MEMBER:
                                        case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                                            to = reservations[0].get('purchaser_email')
                                            break;

                                        case ReservationUtil.PURCHASER_GROUP_STAFF:
                                            to = reservations[0].get('staff_email')
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
                                    } else {
                                        let EmailTemplate = emailTemplates.EmailTemplate
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
                                            } else {
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
                                                        content: ReservationUtil.createQRCode(reservationId)
                                                    });
                                                }


                                                this.logger.info('sending an email...email:', email);
                                                _sendgrid.send(email, (err, json) => {
                                                    this.logger.info('an email sent.', err, json);
                                                    if (err) {
                                                        i++;
                                                        next(i);
                                                    } else {
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
                        }
                    );
                });
            }

            let i = 0;
            next(i);
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
