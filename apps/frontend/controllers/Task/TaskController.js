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
var moment = require('moment');
var conf = require('config');
var mongodb = require('mongodb');
var PerformanceStatusesModel_1 = require('../../../common/models/PerformanceStatusesModel');
var qr = require('qr-image');
var TaskController = (function (_super) {
    __extends(TaskController, _super);
    function TaskController() {
        _super.apply(this, arguments);
    }
    TaskController.prototype.removeTemporaryReservation = function () {
        var _this = this;
        // 仮予約ステータスで、一定時間過ぎた予約を空席にする
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
            // 失敗しても、次のタスクにまかせる(気にしない)
            if (err) {
            }
            else {
                _this.res.send('success');
            }
        });
    };
    TaskController.prototype.createFilms = function () {
        var _this = this;
        var genres = [
            {
                code: "01",
                name: "ヒューマンドラマ",
                name_en: "Human Drama"
            },
            {
                code: "02",
                name: "コメディ",
                name_en: "Comedy"
            },
            {
                code: "03",
                name: "ラブストーリー",
                name_en: "Love Story"
            },
            {
                code: "04",
                name: "エロス",
                name_en: "Eros"
            },
            {
                code: "05",
                name: "青春",
                name_en: "Youth Drama"
            },
        ];
        var sections = [
            {
                code: "01",
                name: "コンペティション",
                name_en: "Competition"
            },
            {
                code: "02",
                name: "アジアの未来",
                name_en: "Asian Future"
            },
            {
                code: "03",
                name: "日本映画スプラッシュ",
                name_en: "Japanese Cinema Splash"
            },
            {
                code: "04",
                name: "特別招待作品",
                name_en: "Special Screenings"
            },
            {
                code: "05",
                name: "パノラマ",
                name_en: "Panorama"
            },
        ];
        var films = [];
        for (var i = 0; i < 300; i++) {
            var no = i + 1;
            var _sections = this.shuffle(sections);
            var _genres = this.shuffle(genres);
            var min = 60 + Math.floor(Math.random() * 120);
            films.push({
                name: "\u30C6\u30B9\u30C8\u4F5C\u54C1\u30BF\u30A4\u30C8\u30EB" + no,
                name_en: "Test Film Title " + no,
                director: "\u30C6\u30B9\u30C8\u76E3\u7763\u540D\u524D" + no,
                director_en: "Test Director Name " + no,
                actor: "\u30C6\u30B9\u30C8\u4FF3\u512A\u540D\u524D" + no,
                actor_en: "Test Actor Name " + no,
                film_min: min,
                sections: _sections.slice(0, Math.floor(Math.random() * 5)),
                genres: _genres.slice(0, Math.floor(Math.random() * 5)),
                created_user: 'system',
                updated_user: 'system',
            });
        }
        this.logger.debug('removing all films...');
        Models_1.default.Film.remove({}, function (err) {
            _this.logger.debug('creating films...');
            Models_1.default.Film.create(films, function (err, filmDocuments) {
                _this.logger.debug('films created.', filmDocuments);
                if (err) {
                }
                else {
                    _this.res.send('success');
                }
            });
        });
    };
    TaskController.prototype.shuffle = function (array) {
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
    TaskController.prototype.getSeats = function () {
        var seats = [];
        var letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        var _loop_1 = function(i) {
            var no = i + 1;
            letters.forEach(function (letter) {
                seats.push({
                    code: letter + "-" + no,
                });
            });
        };
        for (var i = 0; i < 12; i++) {
            _loop_1(i);
        }
        return seats;
    };
    TaskController.prototype.createScreens = function () {
        var _this = this;
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
                _this.logger.debug('screens created.', screenDocuments);
                if (err) {
                }
                else {
                    _this.res.send('success');
                }
            });
        });
    };
    TaskController.prototype.createPerformances = function () {
        var _this = this;
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
                                created_user: 'system',
                                updated_user: 'system',
                            });
                        });
                    });
                });
                // 全削除
                _this.logger.debug('removing all performances...');
                Models_1.default.Performance.remove({}, function (err) {
                    _this.logger.debug('creating performances...');
                    Models_1.default.Performance.create(performances, function (err, performanceDocuments) {
                        _this.logger.debug('performances created.', performanceDocuments);
                        if (err) {
                        }
                        else {
                        }
                        _this.res.send('success');
                    });
                });
            });
        });
    };
    TaskController.prototype.resetReservations = function () {
        var _this = this;
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
                                status: ReservationUtil_1.default.STATUS_AVAILABLE,
                            });
                        });
                    });
                    _this.logger.debug('creating reservations...count:', performances_1.length);
                    var MongoClient = mongodb.MongoClient;
                    var url = conf.get('mongolab_uri');
                    MongoClient.connect(url, function (err, db) {
                        db.collection('reservations').insertMany(performances_1, function (err, result) {
                            _this.logger.debug('reservations created.', err, result);
                            db.close();
                            _this.res.send('success');
                        });
                    });
                });
            }
        });
    };
    TaskController.prototype.updateReservations = function () {
        var _this = this;
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
                _this.res.send("success!! " + limit + " reservations update. benchmark took " + diff[0] + " seconds and " + diff[1] + " nanoseconds.");
            }, function (err) {
                _this.res.send('false');
            });
        });
    };
    TaskController.prototype.calculatePerformanceStatuses = function () {
        var _this = this;
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
                    _this.res.send('success');
                });
            }, function (err) {
                _this.res.send('false');
            });
        });
    };
    TaskController.prototype.createBarcode = function () {
        var text = (this.req.query.text) ? this.req.query.text : "please enter a text.\n";
        // var img = qr.imageSync(text);
        var img = qr.image(text);
        this.res.setHeader('Content-Type', 'image/png');
        img.pipe(this.res);
        // this.res.send(img);
        /*
                var bwipjs = require('bwip-js');
        
                // Optionally load some custom fonts.  Maximum 8.
                // OpenType and TrueType are supported.
                // bwipjs.loadFont('Inconsolata', 108,
                //             require('fs').readFileSync('fonts/Inconsolata.otf', 'binary'));
        
                bwipjs.toBuffer({
                        bcid:        'code128',       // Barcode type
                        text:        text,    // Text to encode
                        scale:       3,               // 3x scaling factor
                        height:      10,              // Bar height, in millimeters
                        includetext: true,            // Show human-readable text
                        textxalign:  'center',        // Always good to set this
                        textfont:    'Inconsolata',   // Use your custom font
                        textsize:    13               // Font size, in points
                    }, (err, png) => {
                        if (err) {
                            throw err;
                            // Decide how to handle the error
                            // `err` may be a string or Error object
                        } else {
                            // `png` is a Buffer
                            // png.length           : PNG file length
                            // png.readUInt32BE(16) : PNG image width
                            // png.readUInt32BE(20) : PNG image height
        
                            // this.res.setHeader('Content-Type', 'image/png');
                            // this.res.send(png);
        
                            this.res.send(`<img src="data:image/png;base64,${png.toString('base64')}">`);
        
                        }
                    });
        */
    };
    return TaskController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TaskController;
