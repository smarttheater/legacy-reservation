"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var Models_1 = require('../../../common/models/Models');
var ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
var PerformanceUtil_1 = require('../../../common/models/Performance/PerformanceUtil');
var FilmUtil_1 = require('../../../common/models/Film/FilmUtil');
var TicketTypeGroupUtil_1 = require('../../../common/models/TicketTypeGroup/TicketTypeGroupUtil');
var ScreenUtil_1 = require('../../../common/models/Screen/ScreenUtil');
var moment = require('moment');
var conf = require('config');
var mongodb = require('mongodb');
var mongoose = require('mongoose');
var PerformanceStatusesModel_1 = require('../../../common/models/PerformanceStatusesModel');
var MONGOLAB_URI = conf.get('mongolab_uri');
var TestController = (function (_super) {
    __extends(TestController, _super);
    function TestController() {
        _super.apply(this, arguments);
    }
    /**
     * 仮予約ステータスで、一定時間過ぎた予約を空席にする
     */
    TestController.prototype.removeTemporaryReservations = function () {
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
        }, function (err, affectedRows) {
            mongoose.disconnect();
            // 失敗しても、次のタスクにまかせる(気にしない)
            if (err) {
            }
            else {
                process.exit(0);
            }
        });
    };
    /**
     * 券種グループを初期化する
     */
    TestController.prototype.createTicketTypeGroups = function () {
        var _this = this;
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.debug('removing all ticketTypeGroups...');
        Models_1.default.TicketTypeGroup.remove({}, function (err) {
            _this.logger.debug('creating films...');
            Models_1.default.TicketTypeGroup.create(TicketTypeGroupUtil_1.default.getAll(), function (err, documents) {
                _this.logger.debug('ticketTypeGroups created.');
                mongoose.disconnect();
                if (err) {
                }
                else {
                    _this.logger.debug('success!');
                    process.exit(0);
                }
            });
        });
    };
    /**
     * 作品を初期化する
     */
    TestController.prototype.createFilms = function () {
        var _this = this;
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.TicketTypeGroup.find({}, '_id', function (err, ticketTypeGroupDocuments) {
            if (err) {
                mongoose.disconnect();
                _this.logger.info('err:', err);
                process.exit(0);
            }
            var genres = FilmUtil_1.default.getGenres();
            var sections = FilmUtil_1.default.getSections();
            var testNames = FilmUtil_1.default.getTestNames();
            var length = testNames.length;
            var films = [];
            _this.logger.info('ticketTypeGroupDocuments.length:', ticketTypeGroupDocuments.length);
            for (var i = 0; i < length; i++) {
                var no = i + 1;
                var _sections = _this.shuffle(sections);
                var _genres = _this.shuffle(genres);
                var _ticketTypeGroupDocuments = _this.shuffle(ticketTypeGroupDocuments);
                var min = 60 + Math.floor(Math.random() * 120);
                films.push({
                    name: testNames[i].name,
                    name_en: testNames[i].name_en,
                    director: "\u30C6\u30B9\u30C8\u76E3\u7763\u540D\u524D" + no,
                    director_en: "Test Director Name " + no,
                    actor: "\u30C6\u30B9\u30C8\u4FF3\u512A\u540D\u524D" + no,
                    actor_en: "Test Actor Name " + no,
                    film_min: min,
                    sections: _sections.slice(0, Math.floor(Math.random() * 5)),
                    genres: _genres.slice(0, Math.floor(Math.random() * 5)),
                    ticket_type_group: _ticketTypeGroupDocuments[0].get('_id'),
                    created_user: 'system',
                    updated_user: 'system',
                });
            }
            _this.logger.debug('removing all films...');
            Models_1.default.Film.remove({}, function (err) {
                _this.logger.debug('creating films...');
                Models_1.default.Film.create(films, function (err, filmDocuments) {
                    _this.logger.debug('films created.');
                    mongoose.disconnect();
                    if (err) {
                    }
                    else {
                        _this.logger.debug('success!');
                        process.exit(0);
                    }
                });
            });
        });
    };
    TestController.prototype.shuffle = function (array) {
        var m = array.length, t, i;
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
    };
    TestController.prototype.getSeats = function () {
        var _this = this;
        var seats = [];
        var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        var grades = ScreenUtil_1.default.getSeatGrades();
        var _loop_1 = function(i) {
            var no = i + 1;
            letters.forEach(function (letter) {
                var _grades = _this.shuffle(grades);
                seats.push({
                    code: letter + "-" + no,
                    grade: _grades[0]
                });
            });
        };
        for (var i = 0; i < 12; i++) {
            _loop_1(i);
        }
        return seats;
    };
    /**
     * スクリーンを初期化する
     */
    TestController.prototype.createScreens = function () {
        var _this = this;
        mongoose.connect(MONGOLAB_URI, {});
        var theaters = [
            '5750f5600b08d7700b973021',
            '5775b0f0cd62cab416b4b361',
            '5775b1bacd62cab416b4b363',
        ];
        var screens = [];
        theaters.forEach(function (theater) {
            for (var i = 0; i < 10; i++) {
                var no = i + 1;
                screens.push({
                    theater: theater,
                    name: "\u30B9\u30AF\u30EA\u30FC\u30F3" + no,
                    name_en: "SCREEN" + no,
                    sections: [
                        {
                            code: 'SEC00',
                            name: 'セクション00',
                            name_en: 'Section00',
                            seats: _this.getSeats()
                        }
                    ],
                    created_user: 'system',
                    updated_user: 'system',
                });
            }
        });
        this.logger.debug('removing all screens...');
        Models_1.default.Screen.remove({}, function (err) {
            _this.logger.debug('creating screens...');
            Models_1.default.Screen.create(screens, function (err, screenDocuments) {
                _this.logger.debug('screens created.');
                mongoose.disconnect();
                if (err) {
                }
                else {
                    _this.logger.debug('success!');
                    process.exit(0);
                }
            });
        });
    };
    /**
     * パフォーマンスを初期化する
     */
    TestController.prototype.createPerformances = function () {
        var _this = this;
        mongoose.connect(MONGOLAB_URI, {});
        var performances = [];
        // 作品ごとのパフォーマンス数(最大3つになるように制御)
        var performancesByFilm = {};
        Models_1.default.Film.find({}, '_id', function (err, filmDocuments) {
            Models_1.default.Screen.find({}, '_id theater', function (err, screenDocuments) {
                var days = ['20161022', '20161023', '20161024', '20161025', '20161026', '20161027', '20161028'];
                var starts = ['0900', '1200', '1500', '1800'];
                var ends = ['1100', '1400', '1700', '2000'];
                // スクリーンごとに4時間帯のスケジュールを登録する
                screenDocuments.forEach(function (screen) {
                    _this.logger.debug('performances length:', performances.length);
                    days.forEach(function (day) {
                        starts.forEach(function (start, index) {
                            // 作品を選考する
                            _this.logger.debug('selecting film...');
                            var _filmId;
                            while (_filmId === undefined) {
                                var _filmDocuments = _this.shuffle(filmDocuments);
                                var _film = _filmDocuments[0];
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
                            _this.logger.debug('pushing performance...');
                            performances.push({
                                theater: screen.get('theater'),
                                screen: screen.get('_id'),
                                film: _filmId,
                                day: day,
                                start_time: start,
                                end_time: ends[index],
                                is_mx4d: _this.shuffle([true, false, false, false])[0],
                                created_user: 'system',
                                updated_user: 'system'
                            });
                        });
                    });
                });
                // 全削除して一気に作成
                _this.logger.debug('removing all performances...');
                Models_1.default.Performance.remove({}, function (err) {
                    _this.logger.debug('creating performances...');
                    Models_1.default.Performance.create(performances, function (err, performanceDocuments) {
                        _this.logger.debug('performances created.');
                        mongoose.disconnect();
                        if (err) {
                        }
                        else {
                        }
                        _this.logger.debug('success!');
                        process.exit(0);
                    });
                });
            });
        });
    };
    /**
     * 予約を初期化する
     */
    TestController.prototype.resetReservations = function () {
        var _this = this;
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Reservation.remove({}, function (err) {
            _this.logger.info('remove processed.', err);
            if (err) {
            }
            else {
                var performances_1 = [];
                // パフォーマンスごとに空席予約を入れる
                Models_1.default.Performance.find({}, '_id screen')
                    .populate('film screen theater')
                    .exec(function (err, performanceDocuments) {
                    performanceDocuments.forEach(function (performanceDocument) {
                        var seats = performanceDocument.get('screen').get('sections')[0].get('seats');
                        var performanceId = performanceDocument.get('_id');
                        seats.forEach(function (seatDocument) {
                            performances_1.push({
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
                    _this.logger.debug('creating reservations...count:', performances_1.length);
                    var MongoClient = mongodb.MongoClient;
                    MongoClient.connect(conf.get('mongolab_uri'), function (err, db) {
                        db.collection('reservations').insertMany(performances_1, function (err, result) {
                            _this.logger.debug('reservations created.', err, result);
                            db.close();
                            _this.logger.debug('success!');
                            process.exit(0);
                        });
                    });
                });
            }
        });
    };
    TestController.prototype.updateReservations = function () {
        var _this = this;
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
        var limit = 1000;
        var promises = [];
        Models_1.default.Reservation.find({ status: ReservationUtil_1.default.STATUS_AVAILABLE }, '_id', { limit: limit }, function (err, reservationDocuments) {
            var startMemory = process.memoryUsage();
            var startTime = process.hrtime();
            reservationDocuments.forEach(function (reservationDocument, index) {
                promises.push(new Promise(function (resolve, reject) {
                    var id = reservationDocument.get('_id');
                    _this.logger.debug('updating reservation..._id:', id, index);
                    Models_1.default.Reservation.update({
                        _id: id,
                        status: ReservationUtil_1.default.STATUS_AVAILABLE
                    }, {
                        status: ReservationUtil_1.default.STATUS_TEMPORARY,
                    }, function (err, affectedRows, raw) {
                        _this.logger.debug('reservation updated. _id:', id, index, err, affectedRows);
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
            Promise.all(promises).then(function () {
                var endMemory = process.memoryUsage();
                var memoryUsage = endMemory.rss - startMemory.rss;
                var diff = process.hrtime(startTime);
                _this.logger.debug("success!! " + limit + " reservations update. benchmark took " + diff[0] + " seconds and " + diff[1] + " nanoseconds.");
            }, function (err) {
                _this.logger.debug('success!');
                process.exit(0);
            });
        });
    };
    TestController.prototype.calculatePerformanceStatuses = function () {
        var _this = this;
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Performance.find({}, '_id day start_time').exec(function (err, performanceDocuments) {
            var promises = [];
            var now = moment().format('YYYYMMDDHHmm');
            var performanceStatusesModel = new PerformanceStatusesModel_1.default();
            performanceDocuments.forEach(function (performanceDocument) {
                // パフォーマンスごとに空席割合を算出する
                promises.push(new Promise(function (resolve, reject) {
                    Models_1.default.Reservation.count({
                        performance: performanceDocument.get('_id'),
                        status: ReservationUtil_1.default.STATUS_AVAILABLE
                    }, function (err, countAvailable) {
                        Models_1.default.Reservation.count({
                            performance: performanceDocument.get('_id'),
                        }, function (err, countAll) {
                            mongoose.disconnect();
                            var start = performanceDocument.get('day') + performanceDocument.get('start_time');
                            var status = PerformanceUtil_1.default.seatNum2status(countAvailable, countAll, start, now);
                            performanceStatusesModel.setStatus(performanceDocument.get('_id'), status);
                            resolve();
                        });
                    });
                }));
            });
            Promise.all(promises).then(function () {
                performanceStatusesModel.save(function (err) {
                    _this.logger.debug('success!');
                    process.exit(0);
                });
            }, function (err) {
                _this.logger.debug('fail.');
                process.exit(0);
            });
        });
    };
    return TestController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
