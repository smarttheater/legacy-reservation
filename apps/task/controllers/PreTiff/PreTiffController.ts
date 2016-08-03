import BaseController from '../BaseController';
import Constants from '../../../common/Util/Constants';
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
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class PreTiffController extends BaseController {
    /**
     * 券種グループを初期化する
     */
    public createTicketTypeGroups(): void {
        mongoose.connect(MONGOLAB_URI, {});

        this.logger.debug('removing all ticketTypeGroups...');
        Models.TicketTypeGroup.remove({}, (err) => {
            this.logger.debug('creating ticketTypeGroups...');
            Models.TicketTypeGroup.create(
                TicketTypeGroupUtil.getAll(),
                (err, documents) => {
                    this.logger.debug('ticketTypeGroups created.');

                    mongoose.disconnect();

                    if (err) {
                    } else {
                        this.logger.debug('success!');
                        process.exit(0);
                    }
                }
            );
        });
    }

    /**
     * 作品を初期化する
     */
    public createFilms(): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.TicketTypeGroup.find({}, '_id', (err, ticketTypeGroupDocuments) => {
            if (err) {
                mongoose.disconnect();
                this.logger.info('err:', err);
                process.exit(0);
            }

            let genres = FilmUtil.getGenres();
            let sections = FilmUtil.getSections();
            let testNames = FilmUtil.getTestNames();
            let length = 1;
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
                    director: `テスト監督名前${no}`,
                    director_en: `Test Director Name ${no}`,
                    actor: `テスト俳優名前${no}`,
                    actor_en: `Test Actor Name ${no}`,
                    film_min: min,
                    sections: _sections.slice(0, Math.floor(Math.random() * 5)),
                    genres: _genres.slice(0, Math.floor(Math.random() * 5)),
                    ticket_type_group: _ticketTypeGroupDocuments[0].get('_id'),
                    created_user: 'system',
                    updated_user: 'system',
                });
            }

            this.logger.debug('removing all films...');
            Models.Film.remove({}, (err) => {
                this.logger.debug('creating films...');
                Models.Film.create(
                    films,
                    (err, filmDocuments) => {
                        this.logger.debug('films created.');

                        mongoose.disconnect();

                        if (err) {
                        } else {
                            this.logger.debug('success!');
                            process.exit(0);
                        }
                    }
                );
            });

        });

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

    private getSeats() {
        let seats = [];
        let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
        let grades = ScreenUtil.getSeatGrades();

        for (let i = 0; i < 20; i++) {
            let no = i + 1;

            letters.forEach((letter) => {
                let _grades = this.shuffle(grades);

                seats.push({
                    code: `${letter}-${no}`,
                    grade: _grades[0]
                })
            })
        }

        return seats;
    }

    /**
     * スクリーンを初期化する
     */
    public createScreens(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let theaters = [
            '5750f5600b08d7700b973021'
        ];


        let screens = [
        ];

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
        Models.Screen.remove({}, (err) => {
            this.logger.debug('creating screens...');
            Models.Screen.create(
                screens,
                (err, screenDocuments) => {
                    this.logger.debug('screens created.');

                    mongoose.disconnect();

                    if (err) {
                    } else {
                        this.logger.debug('success!');
                        process.exit(0);
                    }
                }
            );
        });
    }

    /**
     * パフォーマンスを初期化する
     */
    public createPerformances() {
        mongoose.connect(MONGOLAB_URI, {});

        let performances = [];

        // 作品ごとのパフォーマンス数(最大3つになるように制御)
        let performancesByFilm = {};

        Models.Film.find({}, '_id', (err, filmDocuments) => {
            Models.Screen.findOne({}, '_id theater', (err, screenDocument) => {
                let days = ['20160905'];
                let starts = ['1500'];
                let ends = ['1700'];

                // スクリーンごとに4時間帯のスケジュールを登録する
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
                                } else {
                                    performancesByFilm[_film.get('_id')].push('performance');
                                    _filmId = _film.get('_id');
                                }
                            } else {
                                performancesByFilm[_film.get('_id')] = [];
                                performancesByFilm[_film.get('_id')].push('performance');
                                _filmId = _film.get('_id');
                            }
                        }



                        this.logger.debug('pushing performance...');
                        performances.push({
                            theater: screenDocument.get('theater'),
                            screen: screenDocument.get('_id'),
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




                // 全削除して一気に作成
                this.logger.debug('removing all performances...');
                Models.Performance.remove({}, (err) => {
                    this.logger.debug('creating performances...');
                    Models.Performance.create(
                        performances,
                        (err, performanceDocuments) => {
                            this.logger.debug('performances created.');

                            mongoose.disconnect();

                            if (err) {
                            } else {
                            }

                            this.logger.debug('success!');
                            process.exit(0);
                        }
                    );
                });

            });
        });
    }

    /**
     * 予約を初期化する
     */
    public resetReservations(): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Reservation.remove({}, (err) => {
            this.logger.info('remove processed.', err);

            if (err) {

            } else {
                let performances = [];

                // パフォーマンスごとに空席予約を入れる
           	    Models.Performance.find({}, '_id screen')
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
                                    status: ReservationUtil.STATUS_AVAILABLE,
                                });
                            });
                        });

                        mongoose.disconnect();


                        this.logger.debug('creating reservations...count:', performances.length);
                        let MongoClient = mongodb.MongoClient;
                        MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
                            db.collection('reservations').insertMany(performances, (err, result) => {
                                this.logger.debug('reservations created.', err, result);

                                db.close();

                                this.logger.debug('success!');
                                process.exit(0);
                            });
                        });
                    }
                );
            }
        });
    }

    public updateReservations(): void {
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
        Models.Reservation.find({status: ReservationUtil.STATUS_AVAILABLE}, '_id', {limit: limit}, (err, reservationDocuments) => {

                let startMemory = process.memoryUsage();
                let startTime = process.hrtime();



                reservationDocuments.forEach((reservationDocument, index) => {
                    promises.push(new Promise((resolve, reject) => {
                        let id = reservationDocument.get('_id');
                        this.logger.debug('updating reservation..._id:', id, index);

                        Models.Reservation.update(
                            {
                                _id: id,
                                status: ReservationUtil.STATUS_AVAILABLE
                            },
                            {
                                status: ReservationUtil.STATUS_TEMPORARY,
                            },
                            (err, affectedRows, raw) => {
                                this.logger.debug('reservation updated. _id:', id, index, err, affectedRows);

                                mongoose.disconnect();

                                if (err) {
                                    reject();
                                } else {
                                    resolve();
                                }
                            }
                        );
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

    public calculatePerformanceStatuses() {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Performance.find({}, '_id day start_time').exec((err, performanceDocuments) => {
            let promises = [];
            let now = moment().format('YYYYMMDDHHmm');
            let performanceStatusesModel = new PerformanceStatusesModel();

            performanceDocuments.forEach((performanceDocument) => {
                // パフォーマンスごとに空席割合を算出する
                promises.push(new Promise((resolve, reject) => {
                    Models.Reservation.count(
                        {
                            performance: performanceDocument.get('_id'),
                            status: ReservationUtil.STATUS_AVAILABLE
                        }
                        ,(err, countAvailable) => {

                            Models.Reservation.count(
                                {
                                    performance: performanceDocument.get('_id'),
                                }
                                ,(err, countAll) => {
                                    mongoose.disconnect();

                                    let start = performanceDocument.get('day') + performanceDocument.get('start_time');
                                    let status = PerformanceUtil.seatNum2status(countAvailable, countAll, start, now);
                                    performanceStatusesModel.setStatus(performanceDocument.get('_id'), status);

                                    resolve();
                                }
                            );

                        }
                    );

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
    public releaseSeatsKeptByMembers() {
        let now = moment();
        if (moment(Constants.RESERVE_END_DATETIME) < now) {
            mongoose.connect(MONGOLAB_URI, {});

            this.logger.info('releasing reservations kept by members...');
            Models.Reservation.update(
                {
                    status: ReservationUtil.STATUS_KEPT_BY_MEMBER
                },
                {
                    status: ReservationUtil.STATUS_AVAILABLE,
                    updated_user: this.constructor.toString()
                },
                {
                    multi: true,
                },
                (err, affectedRows) => {
                    mongoose.disconnect();

                    // 失敗しても、次のタスクにまかせる(気にしない)
                    if (err) {
                    } else {
                    }

                    process.exit(0);
                }
            );
        }
    }

    /**
     * 作品画像を取得する
     */
    public getFilmImages() {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Film.find({}, 'name', (err, filmDocuments) => {

            let next = (filmDocument) => {
                let options = {
                    url: `https://api.photozou.jp/rest/search_public.json?limit=1&keyword=${encodeURIComponent(filmDocument.get('name'))}`,
                    json: true
                };

                console.log(options.url);

                request.get(options, (error, response, body) => {
                    if (!error && response.statusCode == 200) {
                        if (body.stat === 'ok' && body.info.photo) {
                            console.log(body.info.photo[0].image_url)
                            let image = body.info.photo[0].image_url

                            // 画像情報更新
                            Models.Film.update(
                                {
                                    _id: filmDocument.get('_id')
                                },
                                {
                                    image: image
                                },
                                (err) => {
                                    this.logger.debug('film udpated.');

                                    if (i === filmDocuments.length - 1) {
                                        this.logger.debug('success!');

                                        mongoose.disconnect();
                                        process.exit(0);

                                    } else {
                                        i++;
                                        next(filmDocuments[i]);

                                    }

                                }
                            );

                        } else {
                            i++;
                            next(filmDocuments[i]);

                        }

                    } else {
                        i++;
                        next(filmDocuments[i]);

                    }
                })


            }

            let i = 0;
            next(filmDocuments[i]);

        });
    }

    public createQRCodes(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let promises = [];
        Models.Reservation.find({})
        // .limit(1)
        .exec((err, reservationDocuments) => {
            for (let reservationDocument of reservationDocuments) {

                promises.push(new Promise((resolve, reject) => {
                    let qr = ReservationUtil.createQRCode(reservationDocument.get('_id').toString());

                    let filename = `${__dirname}/../../../../logs/pretiff/qr/${reservationDocument.get('seat_code')}.png`;
                    fs.writeFile(filename, qr , (err) => {
                        console.log(err);
                        resolve();
                    });
                }));
            }


            Promise.all(promises).then(() => {
                mongoose.disconnect();

                this.logger.debug('success!');
                process.exit(0);

            }, (err) => {
                mongoose.disconnect();

                this.logger.debug('fail.');
                process.exit(0);

            });
        });

    }
}
