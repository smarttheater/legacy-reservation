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

            let sections = FilmUtil.getSections();
            let testNames = FilmUtil.getTestNames();
            let length = 1;
            let films = [];

            this.logger.info('ticketTypeGroupDocuments.length:', ticketTypeGroupDocuments.length);
            for (let i = 0; i < length; i++) {
                let no = i + 1;
                let _sections = this.shuffle(sections);
                let _ticketTypeGroupDocuments = this.shuffle(ticketTypeGroupDocuments);
                let min = 60 + Math.floor(Math.random() * 120);

                films.push({
                    name: testNames[i].name,
                    minutes: min,
                    sections: _sections.slice(0, Math.floor(Math.random() * 5)),
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

    public reservation2reserved() {
        let ticketChoices = [
            {
                "ticket_type_charge": 2000,
                "ticket_type_name_en": "Adults",
                "ticket_type_name": "一般",
                "ticket_type_code": "01"
            },
            {
                "ticket_type_charge": 1500,
                "ticket_type_name_en": "Students",
                "ticket_type_name": "学生",
                "ticket_type_code": "02"
            }
        ];

        let update = {
            "performance": "20160905000001011500",
            "status": "RESERVED",
            "updated_user": "system",
            "payment_method": "0",
            "purchaser_tel": "09012345678",
            "purchaser_email": "ilovegadd@gmail.com",
            "purchaser_first_name": "ヤマザキ",
            "purchaser_last_name": "テツ",
            "film_image": "http://livedoor.4.blogimg.jp/jin115/imgs/0/d/0d48af82.jpg",
            "film_name_en": "SHIN GODZILLA / JAPANESE",
            "film_name": "シン・ゴジラ",
            "film": "000001",
            "screen_name_en": "SCREEN01",
            "screen_name": "スクリーン01",
            "screen": "00000101",
            "theater_name_en": "TOHO CINEMAS Roppongi Hills",
            "theater_name": "TOHOシネマズ 六本木ヒルズ",
            "theater": "000001",
            "performance_is_mx4d": false,
            "performance_end_time": "1500",
            "performance_start_time": "1700",
            "performance_day": "20160905",
            "purchaser_group": "01",
            "payment_no": "1111115945",
            "charge": 5000,
            "total_charge": 17000,
            "purchased_at": Date.now(),
            "gmo_status": "CAPTURE",
            "gmo_pay_type": "0",
            "gmo_tran_date": "20160819121712",
            "gmo_tran_id": "1608191217111111111111879193",
            "gmo_approve": "7764440",
            "gmo_method": "1",
            "gmo_forward": "2a99662",
            "gmo_access_id": "5ddc13f90bff5251aff95534ea35dc0b",
            "gmo_tax": "0",
            "gmo_amount": "17000",
            "gmo_shop_id": "tshop00024015"
        };


        mongoose.connect(MONGOLAB_URI, {});

        let promises = [];
        Models.Reservation.find(
            {
            },
            '_id'
        )
        // .limit(1)
        .exec((err, reservations) => {

            let ticketType = this.shuffle(ticketChoices)[0];
            update = Object.assign(ticketType, update);
            // console.log(update);

            for (let reservation of reservations) {
                promises.push(new Promise((resolve, reject) => {
                    reservation.update(update, (err, raw) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
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
