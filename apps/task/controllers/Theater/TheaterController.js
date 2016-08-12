"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ScreenUtil_1 = require('../../../common/models/Screen/ScreenUtil');
const conf = require('config');
const mongoose = require('mongoose');
let MONGOLAB_URI = conf.get('mongolab_uri');
class TheaterController extends BaseController_1.default {
    createAll() {
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
        Models_1.default.Theater.remove({}, (err) => {
            Models_1.default.Theater.create(theaters, (err) => {
                this.logger.debug('theaters created.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
    getSeats() {
        let seats = [];
        let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        let grades = ScreenUtil_1.default.getSeatGrades();
        for (let i = 0; i < 30; i++) {
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
            '000001',
            '000002',
        ];
        let screens = [];
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
        Models_1.default.Screen.remove({}, (err) => {
            this.logger.debug('creating screens...');
            Models_1.default.Screen.create(screens, (err, screenDocuments) => {
                this.logger.debug('screens created.', err);
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
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TheaterController;
