"use strict";
const BaseController_1 = require('../BaseController');
const Constants_1 = require('../../../common/Util/Constants');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const PerformanceUtil_1 = require('../../../common/models/Performance/PerformanceUtil');
const FilmUtil_1 = require('../../../common/models/Film/FilmUtil');
const TicketTypeGroupUtil_1 = require('../../../common/models/TicketTypeGroup/TicketTypeGroupUtil');
const ScreenUtil_1 = require('../../../common/models/Screen/ScreenUtil');
const moment = require('moment');
const conf = require('config');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const PerformanceStatusesModel_1 = require('../../../common/models/PerformanceStatusesModel');
const request = require('request');
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
    /**
     * 券種グループを初期化する
     */
    createTicketTypeGroups() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.debug('removing all ticketTypeGroups...');
        Models_1.default.TicketTypeGroup.remove({}, (err) => {
            this.logger.debug('creating films...');
            Models_1.default.TicketTypeGroup.create(TicketTypeGroupUtil_1.default.getAll(), (err, documents) => {
                this.logger.debug('ticketTypeGroups created.');
                mongoose.disconnect();
                if (err) {
                }
                else {
                    this.logger.debug('success!');
                    process.exit(0);
                }
            });
        });
    }
    /**
     * 作品を初期化する
     */
    createFilms() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.TicketTypeGroup.find({}, '_id', (err, ticketTypeGroupDocuments) => {
            if (err) {
                mongoose.disconnect();
                this.logger.info('err:', err);
                process.exit(0);
            }
            let genres = FilmUtil_1.default.getGenres();
            let sections = FilmUtil_1.default.getSections();
            let testNames = FilmUtil_1.default.getTestNames();
            let length = testNames.length;
            let films = [];
            this.logger.info('ticketTypeGroupDocuments.length:', ticketTypeGroupDocuments.length);
            for (let i = 0; i < length; i++) {
                let no = i + 1;
                let _sections = this.shuffle(sections);
                let _genres = this.shuffle(genres);
                let _ticketTypeGroupDocuments = this.shuffle(ticketTypeGroupDocuments);
                let min = 60 + Math.floor(Math.random() * 120);
                films.push({
                    name: testNames[i].name,
                    name_en: testNames[i].name_en,
                    sections: _sections.slice(0, Math.floor(Math.random() * 5)),
                    genres: _genres.slice(0, Math.floor(Math.random() * 5)),
                    ticket_type_group: _ticketTypeGroupDocuments[0].get('_id'),
                    created_user: 'system',
                    updated_user: 'system',
                });
            }
            this.logger.debug('removing all films...');
            Models_1.default.Film.remove({}, (err) => {
                this.logger.debug('creating films...');
                Models_1.default.Film.create(films, (err, filmDocuments) => {
                    this.logger.debug('films created.');
                    mongoose.disconnect();
                    if (err) {
                    }
                    else {
                        this.logger.debug('success!');
                        process.exit(0);
                    }
                });
            });
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
    getSeats() {
        let seats = [];
        let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
        let grades = ScreenUtil_1.default.getSeatGrades();
        for (let i = 0; i < 24; i++) {
            let no = i + 1;
            letters.forEach((letter) => {
                let _grades = this.shuffle(grades);
                seats.push({
                    code: `${letter}-${no}`,
                    grade: _grades[0]
                });
            });
        }
        return seats;
    }
    /**
     * スクリーンを初期化する
     */
    createScreens() {
        mongoose.connect(MONGOLAB_URI, {});
        let theaters = [
            '5750f5600b08d7700b973021',
            '5775b0f0cd62cab416b4b361',
            '5775b1bacd62cab416b4b363',
        ];
        let screens = [];
        theaters.forEach((theater) => {
            for (let i = 0; i < 10; i++) {
                let no = i + 1;
                screens.push({
                    theater: theater,
                    name: `スクリーン${no}`,
                    name_en: `SCREEN${no}`,
                    sections: [
                        {
                            code: 'SEC00',
                            name: 'セクション00',
                            name_en: 'Section00',
                            seats: this.getSeats()
                        }
                    ],
                    created_user: 'system',
                    updated_user: 'system',
                });
            }
        });
        this.logger.debug('removing all screens...');
        Models_1.default.Screen.remove({}, (err) => {
            this.logger.debug('creating screens...');
            Models_1.default.Screen.create(screens, (err, screenDocuments) => {
                this.logger.debug('screens created.');
                mongoose.disconnect();
                if (err) {
                }
                else {
                    this.logger.debug('success!');
                    process.exit(0);
                }
            });
        });
    }
    /**
     * パフォーマンスを初期化する
     */
    createPerformances() {
        mongoose.connect(MONGOLAB_URI, {});
        let performances = [];
        // 作品ごとのパフォーマンス数(最大3つになるように制御)
        let performancesByFilm = {};
        Models_1.default.Film.find({}, '_id', (err, filmDocuments) => {
            Models_1.default.Screen.find({}, '_id theater', (err, screenDocuments) => {
                let days = ['20161022', '20161023', '20161024', '20161025', '20161026', '20161027', '20161028'];
                let starts = ['0900', '1200', '1500', '1800'];
                let ends = ['1100', '1400', '1700', '2000'];
                // スクリーンごとに4時間帯のスケジュールを登録する
                screenDocuments.forEach((screen) => {
                    this.logger.debug('performances length:', performances.length);
                    days.forEach((day) => {
                        starts.forEach((start, index) => {
                            // 作品を選考する
                            this.logger.debug('selecting film...');
                            let _filmId;
                            while (_filmId === undefined) {
                                let _filmDocuments = this.shuffle(filmDocuments);
                                let _film = _filmDocuments[0];
                                if (performancesByFilm.hasOwnProperty(_film.get('_id'))) {
                                    if (performancesByFilm[_film.get('_id')].length > 2) {
                                        continue;
                                    }
                                    else {
                                        performancesByFilm[_film.get('_id')].push('performance');
                                        _filmId = _film.get('_id');
                                    }
                                }
                                else {
                                    performancesByFilm[_film.get('_id')] = [];
                                    performancesByFilm[_film.get('_id')].push('performance');
                                    _filmId = _film.get('_id');
                                }
                            }
                            this.logger.debug('pushing performance...');
                            performances.push({
                                theater: screen.get('theater'),
                                screen: screen.get('_id'),
                                film: _filmId,
                                day: day,
                                start_time: start,
                                end_time: ends[index],
                                is_mx4d: this.shuffle([true, false, false, false])[0],
                                created_user: 'system',
                                updated_user: 'system'
                            });
                        });
                    });
                });
                // 全削除して一気に作成
                this.logger.debug('removing all performances...');
                Models_1.default.Performance.remove({}, (err) => {
                    this.logger.debug('creating performances...');
                    Models_1.default.Performance.create(performances, (err, performanceDocuments) => {
                        this.logger.debug('performances created.');
                        mongoose.disconnect();
                        if (err) {
                        }
                        else {
                        }
                        this.logger.debug('success!');
                        process.exit(0);
                    });
                });
            });
        });
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
    calculatePerformanceStatuses() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Performance.find({}, 'day start_time screen').populate('screen', 'sections')
            .exec((err, performanceDocuments) => {
            let promises = [];
            let now = moment().format('YYYYMMDDHHmm');
            let performanceStatusesModel = new PerformanceStatusesModel_1.default();
            performanceDocuments.forEach((performanceDocument) => {
                // パフォーマンスごとに空席割合を算出する
                promises.push(new Promise((resolve, reject) => {
                    Models_1.default.Reservation.count({
                        performance: performanceDocument.get('_id')
                    }, (err, reservationCount) => {
                        if (err) {
                        }
                        else {
                            console.log(reservationCount);
                            let seatCount = performanceDocument.get('screen').get('sections')[0].seats.length;
                            let start = performanceDocument.get('day') + performanceDocument.get('start_time');
                            let status = PerformanceUtil_1.default.seatNum2status(reservationCount, seatCount, start, now);
                            performanceStatusesModel.setStatus(performanceDocument.get('_id'), status);
                        }
                        resolve();
                    });
                }));
            });
            Promise.all(promises).then(() => {
                performanceStatusesModel.save((err) => {
                    this.logger.debug('success!');
                    mongoose.disconnect();
                    process.exit(0);
                });
            }, (err) => {
                this.logger.debug('fail.');
                mongoose.disconnect();
                process.exit(0);
            });
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
     * 作品画像を取得する
     */
    getFilmImages() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Film.find({}, 'name', (err, filmDocuments) => {
            let next = (filmDocument) => {
                let options = {
                    url: `https://api.photozou.jp/rest/search_public.json?limit=1&keyword=${encodeURIComponent(filmDocument.get('name'))}`,
                    json: true
                };
                console.log(options.url);
                request.get(options, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        if (body.stat === 'ok' && body.info.photo) {
                            console.log(body.info.photo[0].image_url);
                            let image = body.info.photo[0].image_url;
                            // 画像情報更新
                            Models_1.default.Film.update({
                                _id: filmDocument.get('_id')
                            }, {
                                image: image
                            }, (err) => {
                                this.logger.debug('film udpated.');
                                if (i === filmDocuments.length - 1) {
                                    this.logger.debug('success!');
                                    mongoose.disconnect();
                                    process.exit(0);
                                }
                                else {
                                    i++;
                                    next(filmDocuments[i]);
                                }
                            });
                        }
                        else {
                            i++;
                            next(filmDocuments[i]);
                        }
                    }
                    else {
                        i++;
                        next(filmDocuments[i]);
                    }
                });
            };
            let i = 0;
            next(filmDocuments[i]);
        });
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
        }).limit(10).exec((err, cueDocuments) => {
            this.logger.info('reservationEmailCues found.', err, cueDocuments);
            if (err || cueDocuments.length === 0) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            let _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
            let next = (i) => {
                if (i === cueDocuments.length) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                let cueDocument = cueDocuments[i];
                // 予約ロガーを取得
                Util_1.default.getReservationLogger(cueDocument.get('payment_no'), (err, logger) => {
                    if (err) {
                    }
                    else {
                        this.logger = logger;
                    }
                    // 送信
                    Models_1.default.Reservation.find({
                        payment_no: cueDocument.get('payment_no'),
                        status: ReservationUtil_1.default.STATUS_RESERVED
                    }, (err, reservationDocuments) => {
                        if (err) {
                            i++;
                            next(i);
                        }
                        else {
                            if (reservationDocuments.length === 0) {
                                // 送信済みフラグを立てる
                                cueDocument.set('is_sent', true);
                                cueDocument.save((err, res) => {
                                    i++;
                                    next(i);
                                });
                            }
                            else {
                                let to = '';
                                let purchaserGroup = reservationDocuments[0].get('purchaser_group');
                                switch (purchaserGroup) {
                                    case ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER:
                                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                                    case ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR:
                                        to = reservationDocuments[0].get('purchaser_email');
                                        break;
                                    case ReservationUtil_1.default.PURCHASER_GROUP_STAFF:
                                        to = reservationDocuments[0].get('staff_email');
                                        break;
                                    default:
                                        break;
                                }
                                if (!to) {
                                    mongoose.disconnect();
                                    process.exit(0);
                                    return;
                                }
                                let EmailTemplate = emailTemplates.EmailTemplate;
                                var path = require('path');
                                let dir = `${__dirname}/../../views/email/reserveComplete`;
                                let template = new EmailTemplate(dir);
                                let locals = {
                                    reservationDocuments: reservationDocuments
                                };
                                template.render(locals, (err, result) => {
                                    if (err) {
                                        i++;
                                        next(i);
                                    }
                                    else {
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
    createStaffs() {
        mongoose.connect(MONGOLAB_URI, {});
        let password_salt = Util_1.default.createToken();
        Models_1.default.Staff.create({
            user_id: 'motionpicture',
            password_salt: password_salt,
            password_hash: Util_1.default.createHash('password', password_salt),
            name: 'モーションピクチャー',
            email: 'ilovegadd@gmail.com',
            tel: '09012345678',
            department_name: '作品部'
        }, () => {
            mongoose.disconnect();
            process.exit(0);
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
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
