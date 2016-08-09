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
