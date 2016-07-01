import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import moment = require('moment');
import conf = require('config');
import mongodb = require('mongodb');

export default class TaskController extends BaseController {
    public removeTemporaryReservation(): void {
        // 仮予約ステータスで、一定時間過ぎた予約を空席にする
        this.logger.info('updating temporary reservations...');
        Models.Reservation.update(
            {
                status: ReservationUtil.STATUS_TEMPORARY,
                updated_dt: {
                    $lt: moment().add('minutes', -10).toISOString(),
                },
            },
            {
                status: ReservationUtil.STATUS_AVAILABLE,
            },
            {
                multi: true,
            },
            (err) => {
                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                } else {
                    this.res.send('success');
                }
            }
        );
    }

    public createFilms(): void {

        let genres = [
            {
                "type": "01",
                "name": "ヒューマンドラマ",
                "name_en": "Human Drama"
            },
            {
                "type": "02",
                "name": "コメディ",
                "name_en": "Comedy"
            },
            {
                "type": "03",
                "name": "ラブストーリー",
                "name_en": "Love Story"
            },
            {
                "type": "04",
                "name": "エロス",
                "name_en": "Eros"
            },
            {
                "type": "05",
                "name": "青春",
                "name_en": "Youth Drama"
            },
        ];

        let sections = [
            {
                "type": "01",
                "name": "コンペティション",
                "name_en": "Competition"
            },
            {
                "type": "02",
                "name": "アジアの未来",
                "name_en": "Asian Future"
            },
            {
                "type": "03",
                "name": "日本映画スプラッシュ",
                "name_en": "Japanese Cinema Splash"
            },
            {
                "type": "04",
                "name": "特別招待作品",
                "name_en": "Special Screenings"
            },
            {
                "type": "05",
                "name": "パノラマ",
                "name_en": "Panorama"
            },
        ];

        let films = [
        ];

        for (let i = 0; i < 120; i++) {
            let no = i + 1;
            let _sections = this.shuffle(sections);
            let _genres = this.shuffle(genres);
            let min = 60 + Math.floor(Math.random() * 120);


            films.push({
                name: `テスト作品タイトル${no}`,
                name_en: `Test Film Title ${no}`,
                director: `テスト監督名前${no}`,
                director_en: `Test Director Name ${no}`,
                actor: `テスト俳優名前${no}`,
                actor_en: `Test Actor Name ${no}`,
                film_min: min,
                sections: _sections.slice(0, Math.floor(Math.random() * 5)),
                genres: _genres.slice(0, Math.floor(Math.random() * 5)),
                created_user: 'system',
                updated_user: 'system',
            });
        }

        Models.Film.remove({}, (err) => {
            Models.Film.create(
                films,
                (err, filmDocuments) => {
                    console.log(filmDocuments);
                    if (err) {
                    } else {
                        this.res.send('success');
                    }
                }
            );
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
        let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        for (let i = 0; i < 12; i++) {
            let no = i + 1;

            letters.forEach((letter) => {
                seats.push({
                    code: `${letter}-${no}`,
                })
            })
        }

        return seats;
    }

    public createScreens(): void {
        let theaters = [
            '5750f5600b08d7700b973021',
            '5775b0f0cd62cab416b4b361',
            '5775b1bacd62cab416b4b363',
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



        Models.Screen.create(
            screens,
            (err, screenDocuments) => {
                console.log(screenDocuments);
                if (err) {
                } else {
                    this.res.send('success');
                }
            }
        );
    }

    public createPerformances() {
        // 全削除
        Models.Performance.remove({}, (err) => {
            let performances = [];

            Models.Film.find({}, (err, filmDocuments) => {
                Models.Screen.find({}, (err, screenDocuments) => {
                    let days = ['20161022', '20161023', '20161024', '20161025', '20161026', '20161027', '20161028'];
                    let starts = ['0900', '1200', '1500', '1800'];
                    let ends = ['1100', '1400', '1700', '2000'];

                    // スクリーンごとに4時間帯のスケジュールを登録する
                    screenDocuments.forEach((screen) => {
                        days.forEach((day) => {
                            starts.forEach((start, index) => {
                                let _filmDocuments = this.shuffle(filmDocuments);

                                performances.push({
                                    theater: screen.get('theater'),
                                    screen: screen.get('_id'),
                                    film: _filmDocuments[0].get('_id'),
                                    day: day,
                                    start_time: start,
                                    end_time: ends[index],
                                    created_user: 'system',
                                    updated_user: 'system',
                                });
                            });
                        });
                    });

                    Models.Performance.create(
                        performances,
                        (err, performanceDocuments) => {
                            if (err) {
                            } else {
                            }

                            this.res.send('success');
                        }
                    );
                });
            });
        });
    }

    public resetReservations(): void {
        Models.Reservation.remove({}, (err) => {
            this.logger.info('remove processed.', err);

            if (err) {

            } else {
                let performances = [];

                // パフォーマンスごとに空席予約を入れる
           	    Models.Performance.find({})
                    .populate('film screen theater')
                    .exec((err, performanceDocuments) => {
                        performanceDocuments.forEach((performanceDocument) => {
                            let seats = performanceDocument.get('screen').get('sections')[0].get('seats');
                            let performanceId = performanceDocument.get('_id');

                            seats.forEach((seatDocument) => {
                                performances.push({
                                    performance: performanceId,
                                    seat_code: seatDocument.get('code'),
                                    status: ReservationUtil.STATUS_AVAILABLE,
                                });
                            });
                        });


                        this.logger.debug('creating reservations...count:', performances.length);
                        let MongoClient = mongodb.MongoClient;
                        var url = conf.get<string>('mongolab_uri');
                        MongoClient.connect(url, (err, db) => {
                            db.collection('reservations').insertMany(performances, (err, result) => {
                                this.logger.debug('reservations created.', err, result);

                                db.close();
                                this.res.send('success');
                            });
                        });
                    }
                );
            }
        });
    }

    public updateReservations(): void {
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


        let limit = 100;

        let promises = [];
        Models.Reservation.find({status: ReservationUtil.STATUS_AVAILABLE}, {}, {limit: limit}, (err, reservationDocuments) => {

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

                    this.res.send(`success!! ${limit} reservations update. benchmark took ${diff[0]} seconds and ${diff[1]} nanoseconds.`);

                }, (err) => {
                    this.res.send('false');

                });



        });
    }
}
