"use strict";
const BaseController_1 = require('../BaseController');
const mongoose = require('mongoose');
const conf = require('config');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const Util_1 = require('../../../common/Util/Util');
let MONGOLAB_URI = conf.get('mongolab_uri');
class TestController extends BaseController_1.default {
    publishPaymentNo() {
        mongoose.connect(MONGOLAB_URI, {});
        ReservationUtil_1.default.publishPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }
    checkFullWidthLetter() {
        let filmName = '作家性の萌芽　1999-2003 （細田守監督短編集）『劇場版デジモンアドベンチャー』『劇場版デジモンアドベンチャー　ぼくらのウォーゲーム！』『村上隆作品　SUPERFLAT MONOGRAM』『村上隆作品　The Creatures From Planet 66 ～Roppongi Hills Story～』『おジャ魔女どれみドッカ～ン！（40話）』『明日のナージャ（OP、ED）』';
        let filmNameFullWidth = Util_1.default.toFullWidth(filmName);
        let registerDisp1 = '';
        for (let i = 0; i < filmNameFullWidth.length; i++) {
            let letter = filmNameFullWidth[i];
            if (letter.match(/[Ａ-Ｚａ-ｚ０-９]/)
                || letter.match(/[\u3040-\u309F]/) // ひらがな
                || letter.match(/[\u30A0-\u30FF]/) // カタカナ
                || letter.match(/[一-龠]/) // 漢字
            ) {
                registerDisp1 += letter;
            }
        }
        console.log(registerDisp1);
        process.exit(0);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
