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
let MONGOLAB_URI = conf.get('mongolab_uri');
class TestController extends BaseController_1.default {
    /**
     * 仮予約ステータスで、一定時間過ぎた予約を空席にする
     */
    removeTemporaryReservations() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('updating temporary reservations...');
        Models_1.default.Reservation.update({
            status: ReservationUtil_1.default.STATUS_TEMPORARY,
            updated_dt: {
                $lt: moment().add(-10, 'minutes').toISOString(),
            },
        }, {
            status: ReservationUtil_1.default.STATUS_AVAILABLE,
            updated_user: this.constructor.toString()
        }, {
            multi: true,
        }, (err, affectedRows) => {
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
        let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        let grades = ScreenUtil_1.default.getSeatGrades();
        for (let i = 0; i < 12; i++) {
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
            if (err) {
            }
            else {
                let performances = [];
                // パフォーマンスごとに空席予約を入れる
                Models_1.default.Performance.find({}, '_id screen')
                    .populate('film screen theater')
                    .exec((err, performanceDocuments) => {
                    performanceDocuments.forEach((performanceDocument) => {
                        let seats = performanceDocument.get('screen').get('sections')[0].get('seats');
                        let performanceId = performanceDocument.get('_id');
                        seats.forEach((seatDocument) => {
                            performances.push({
                                performance: performanceId,
                                seat_code: seatDocument.get('code'),
                                seat_grade_name: seatDocument.get('grade').name,
                                seat_grade_name_en: seatDocument.get('grade').name_en,
                                seat_grade_additional_charge: seatDocument.get('grade').additional_charge,
                                status: ReservationUtil_1.default.STATUS_AVAILABLE,
                            });
                        });
                    });
                    mongoose.disconnect();
                    this.logger.debug('creating reservations...count:', performances.length);
                    let MongoClient = mongodb.MongoClient;
                    MongoClient.connect(conf.get('mongolab_uri'), (err, db) => {
                        db.collection('reservations').insertMany(performances, (err, result) => {
                            this.logger.debug('reservations created.', err, result);
                            db.close();
                            this.logger.debug('success!');
                            process.exit(0);
                        });
                    });
                });
            }
        });
    }
    updateReservations() {
        mongoose.connect(MONGOLAB_URI, {});
        // パフォーマンスごとに空席予約を入れる
        this.logger.debug('updating reservations...');
        // Models.Reservation.update(
        //     {
        //         status: ReservationUtil.STATUS_AVAILABLE
        //     },
        //     {
        //         status: ReservationUtil.STATUS_TEMPORARY,
        //     },
        //     {
        //         multi: true
        //     },
        //     (err, affectedRows) => {
        //         this.logger.debug('reservations updated.', err, affectedRows);
        //         this.res.send('success');
        //     }
        // );
        let limit = 1000;
        let promises = [];
        Models_1.default.Reservation.find({ status: ReservationUtil_1.default.STATUS_AVAILABLE }, '_id', { limit: limit }, (err, reservationDocuments) => {
            let startMemory = process.memoryUsage();
            let startTime = process.hrtime();
            reservationDocuments.forEach((reservationDocument, index) => {
                promises.push(new Promise((resolve, reject) => {
                    let id = reservationDocument.get('_id');
                    this.logger.debug('updating reservation..._id:', id, index);
                    Models_1.default.Reservation.update({
                        _id: id,
                        status: ReservationUtil_1.default.STATUS_AVAILABLE
                    }, {
                        status: ReservationUtil_1.default.STATUS_TEMPORARY,
                    }, (err, affectedRows, raw) => {
                        this.logger.debug('reservation updated. _id:', id, index, err, affectedRows);
                        mongoose.disconnect();
                        if (err) {
                            reject();
                        }
                        else {
                            resolve();
                        }
                    });
                }));
            });
            Promise.all(promises).then(() => {
                let endMemory = process.memoryUsage();
                let memoryUsage = endMemory.rss - startMemory.rss;
                let diff = process.hrtime(startTime);
                this.logger.debug(`success!! ${limit} reservations update. benchmark took ${diff[0]} seconds and ${diff[1]} nanoseconds.`);
            }, (err) => {
                this.logger.debug('success!');
                process.exit(0);
            });
        });
    }
    calculatePerformanceStatuses() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Performance.find({}, '_id day start_time').exec((err, performanceDocuments) => {
            let promises = [];
            let now = moment().format('YYYYMMDDHHmm');
            let performanceStatusesModel = new PerformanceStatusesModel_1.default();
            performanceDocuments.forEach((performanceDocument) => {
                // パフォーマンスごとに空席割合を算出する
                promises.push(new Promise((resolve, reject) => {
                    Models_1.default.Reservation.count({
                        performance: performanceDocument.get('_id'),
                        status: ReservationUtil_1.default.STATUS_AVAILABLE
                    }, (err, countAvailable) => {
                        Models_1.default.Reservation.count({
                            performance: performanceDocument.get('_id'),
                        }, (err, countAll) => {
                            mongoose.disconnect();
                            let start = performanceDocument.get('day') + performanceDocument.get('start_time');
                            let status = PerformanceUtil_1.default.seatNum2status(countAvailable, countAll, start, now);
                            performanceStatusesModel.setStatus(performanceDocument.get('_id'), status);
                            resolve();
                        });
                    });
                }));
            });
            Promise.all(promises).then(() => {
                performanceStatusesModel.save((err) => {
                    this.logger.debug('success!');
                    process.exit(0);
                });
            }, (err) => {
                this.logger.debug('fail.');
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
            Models_1.default.Reservation.update({
                status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER
            }, {
                status: ReservationUtil_1.default.STATUS_AVAILABLE,
                updated_user: this.constructor.toString()
            }, {
                multi: true,
            }, (err, affectedRows) => {
                mongoose.disconnect();
                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                }
                else {
                }
                process.exit(0);
            });
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
    sendCompleteEmail() {
        mongoose.connect(MONGOLAB_URI, {});
        let promises = [];
        Models_1.default.ReservationEmailCue.find({
            is_sent: false
        }).limit(10).exec((err, cueDocuments) => {
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
                        let to = '';
                        let purchaserGroup = reservationDocuments[0].get('purchaser_group');
                        switch (purchaserGroup) {
                            case ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER:
                                to = reservationDocuments[0].get('purchaser_email');
                                break;
                            default:
                                break;
                        }
                        let _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
                        let email = new _sendgrid.Email({
                            to: to,
                            from: 'noreply@devtiffwebapp.azurewebsites.net',
                            subject: `[TIFF][${process.env.NODE_ENV}] 予約完了`,
                            html: '<html><body>complete</body></html>'
                        });
                        // add barcodes
                        for (let reservationDocument of reservationDocuments) {
                            let reservationId = reservationDocument.get('_id').toString();
                        }
                        this.logger.info('sending an email...email:', email);
                        _sendgrid.send(email, (err, json) => {
                            this.logger.info('an email sent.', err, json);
                            if (err) {
                                i++;
                                next(i);
                            }
                            else {
                                // TODO 送信済みフラグを立てる
                                cueDocument.set('is_sent', true);
                                cueDocument.save((err, res) => {
                                    i++;
                                    next(i);
                                });
                            }
                        });
                    });
                });
            };
            let i = 0;
            next(i);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
