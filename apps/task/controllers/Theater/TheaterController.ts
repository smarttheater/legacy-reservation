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
import mongoose = require('mongoose');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class TheaterController extends BaseController {
    public createAll(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let theaters = [
            {
                _id: '000001',
                name: 'TOHOシネマズ 六本木ヒルズ',
                name_en: 'TOHO CINEMAS Roppongi Hills',
                address: '東京都港区六本木6-10-2 六本木ヒルズけやき坂コンプレックス内',
                tel: '05068685024',
                fax: '05068685024',
                created_user: 'system',
                updated_user: 'system',
            },
            {
                // _id: '5775b0f0cd62cab416b4b361',
                _id: '000002',
                name: 'EX THEATER 六本木',
                name_en: 'EX THEATER ROPPONGI',
                address: '東京都港区西麻布1-2-9',
                tel: '0364062222',
                fax: '0364062222',
                created_user: 'system',
                updated_user: 'system',
            }
        ];

        Models.Theater.remove({}, (err) => {
            Models.Theater.create(theaters, (err) => {
                this.logger.debug('theaters created.', err);

                mongoose.disconnect();
                process.exit(0);
            });
        })
    }

    private getSeats() {
        let seats = [];
        let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        let grades = ScreenUtil.getSeatGrades();

        for (let i = 0; i < 30; i++) {
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
            '000001',
            '000002',
        ];


        let screens = [
        ];

        theaters.forEach((theater) => {
            for (let i = 0; i < 10; i++) {
                let no = (i + 1 < 10) ? `0${i + 1}` : `${i + 1}`;

                screens.push({
                    _id: theater + no,
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
                    this.logger.debug('screens created.', err);

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
}
