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
        ).limit(10).exec((err, cueDocuments) => {
            this.logger.info('reservationEmailCues found.', err, cueDocuments);

            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            if (cueDocuments.length === 0) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));

            let next = (i: number) => {
                if (i === cueDocuments.length) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;

                }

                let cueDocument = cueDocuments[i];

                // 予約ロガーを取得
                Util.getReservationLogger(cueDocument.get('payment_no'), (err, logger) => {
                    if (err) {
                        // 失敗したらデフォルトロガーに逃げる

                    } else {
                        this.logger = logger;
                    }

                    // 送信
                    Models.Reservation.find(
                        {
                            payment_no: cueDocument.get('payment_no'),
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        (err, reservationDocuments) => {
                            if (err) {
                                i++;
                                next(i);

                            } else {
                                if (reservationDocuments.length === 0) {
                                    // 送信済みフラグを立てる
                                    cueDocument.set('is_sent', true);
                                    cueDocument.save((err, res) => {
                                        i++;
                                        next(i);

                                    });
                                    
                                } else {
                                    let to = '';
                                    let purchaserGroup = reservationDocuments[0].get('purchaser_group');
                                    switch (purchaserGroup) {
                                        case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                                        case ReservationUtil.PURCHASER_GROUP_MEMBER:
                                        case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                                            to = reservationDocuments[0].get('purchaser_email')
                                            break;

                                        case ReservationUtil.PURCHASER_GROUP_STAFF:
                                            to = reservationDocuments[0].get('staff_email')
                                            break;

                                        default:
                                            break;

                                    }


                                    if (!to) {
                                        mongoose.disconnect();
                                        process.exit(0);
                                        return;

                                    }

                                    let EmailTemplate = emailTemplates.EmailTemplate
                                    var path = require('path')

                                    let dir = `${__dirname}/../../views/email/reserveComplete`;

                                    let template = new EmailTemplate(dir);
                                    let locals = {
                                        reservationDocuments: reservationDocuments
                                    };
                                    template.render(locals, (err, result) => {
                                        if (err) {
                                            i++;
                                            next(i);

                                        } else {
                                            let email = new _sendgrid.Email({
                                                to: to,
                                                from: 'noreply@devtiffwebapp.azurewebsites.net',
                                                subject: `[TIFF][${process.env.NODE_ENV}] 予約完了`,
                                                html: result.html
                                            });


                                            // add barcodes
                                            for (let reservationDocument of reservationDocuments) {
                                                let reservationId = reservationDocument.get('_id').toString();

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
                                                    cueDocument.set('is_sent', true);
                                                    cueDocument.save((err, res) => {
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

    public createMemberReservations() {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Performance.findOne().populate('screen').exec((err, performance) => {
            let seats = performance.get('screen').sections[0].seats;

            // 適当に座席を2つ選択
            seats = this.shuffle(seats);

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

                        let newReservation1 = {
                            performance: performance.get('_id'),
                            seat_code: seats[0].code,
                            payment_no: paymentNo,
                            purchaser_group: ReservationUtil.PURCHASER_GROUP_MEMBER,
                            status: ReservationUtil.STATUS_KEPT_BY_MEMBER,
                            member: '57723c84e037e2bc26e2bcd0'
                        }
                        let newReservation2 = {
                            performance: performance.get('_id'),
                            seat_code: seats[1].code,
                            payment_no: paymentNo,
                            purchaser_group: ReservationUtil.PURCHASER_GROUP_MEMBER,
                            status: ReservationUtil.STATUS_KEPT_BY_MEMBER,
                            member: '57723c84e037e2bc26e2bcd0'
                        }

                        Models.Reservation.create(newReservation1, newReservation2, (err, reservation1, reservation2) => {
                            this.logger.debug('reservations created.', err, reservation1, reservation2);

                            mongoose.disconnect();
                            process.exit(0);
                        })
                    }
                }
            );
        });
    }
}
