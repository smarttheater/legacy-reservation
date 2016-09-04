"use strict";
const redis = require('redis');
const conf = require('config');
const crypto = require('crypto');
const fs = require('fs-extra');
const log4js = require('log4js');
const qr = require('qr-image');
const uniqid = require('uniqid');
const Models_1 = require('../../common/models/Models');
/**
 * 共通のユーティリティ
 */
class Util {
    /**
     * トークン生成
     *
     * @return {string}
     */
    static createToken() {
        let md5hash = crypto.createHash('md5');
        // console.log(uniqid()); // Generate 18 byte unique id's based on the time, process id and mac address. Works on multiple processes and machines.
        // console.log(uniqid.process()); // Generate 12 byte unique id's based on the time and the process id. Works on multiple processes within a single machine but not on multiple machines.
        // console.log(uniqid.time()); // Generate 8 byte unique id's based on the current time only. Recommended only on a single process on a single machine.
        md5hash.update(Math.floor(Math.random() * 10000) + 1000 + uniqid.process(), 'binary');
        let token = md5hash.digest('hex');
        return token;
    }
    /**
     * RedisCacheクライアントを取得する
     */
    static getRedisClient() {
        let client = redis.createClient(conf.get('redis_port'), conf.get('redis_host'), {
            password: conf.get('redis_key'),
            tls: { servername: conf.get('redis_host') }
        });
        return client;
    }
    /**
     * 予約IDからQRコードを作成する
     *
     * @param {string} reservationId 予約ID
     */
    static createQRCode(reservationId) {
        return qr.imageSync(reservationId, {
            type: 'png'
        });
    }
    /**
     * 予約プロセス用のロガーを設定する
     * 1決済管理番号につき、1ログファイル
     *
     * @param {string} paymentNo 予約番号
     */
    static getReservationLogger(paymentNo, cb) {
        let env = process.env.NODE_ENV || 'dev';
        let logDir = `${__dirname}/../../../logs/${env}/reservations/${paymentNo.substr(-1)}`;
        fs.mkdirs(logDir, (err) => {
            if (err) {
                cb(err, null);
            }
            else {
                log4js.configure({
                    appenders: [
                        {
                            category: 'reservation',
                            type: 'file',
                            filename: `${logDir}/${paymentNo}.log`,
                            pattern: '-yyyy-MM-dd'
                        },
                        {
                            type: 'console'
                        }
                    ],
                    levels: {
                        reserve: 'ALL'
                    },
                    replaceConsole: true
                });
                cb(null, log4js.getLogger('reservation'));
            }
        });
    }
    /**
     * ハッシュ値を作成する
     *
     * @param {string} password
     * @param {string} salt
     */
    static createHash(password, salt) {
        let sha512 = crypto.createHash('sha512');
        sha512.update(salt + password, 'utf8');
        let hash = sha512.digest('hex');
        return hash;
    }
    /**
     * 購入管理番号生成
     */
    static createPaymentNo(cb) {
        Models_1.default.Sequence.findOneAndUpdate({ target: 'payment_no' }, { $inc: { no: 1 } }, { new: true }, (err, sequence) => {
            if (err) {
                cb(err, null);
            }
            else {
                let no = sequence.get('no');
                let random = 1 + Math.floor(Math.random() * 9); // 1-9の整数
                let checKDigit = Util.getCheckDigit(no);
                // sortTypes[checkDigit]で並べ替える
                let sortType = Util.SORT_TYPES_PAYMENT_NO[checKDigit];
                let paymentNo = random + sortType.map((index) => { return no.toString().substr(index, 1); }).join('') + checKDigit.toString();
                cb(err, paymentNo);
            }
        });
    }
    /**
     * チェックディジットを求める
     *
     * @param {number} source
     */
    static getCheckDigit(source) {
        let sourceString = source.toString();
        if (sourceString.length !== 9)
            throw new Error('source length must be 9.');
        let sum = 0;
        sourceString.split('').reverse().forEach((digitNumber, index) => {
            sum += parseInt(digitNumber) * Util.CHECK_DIGIT_WEIGHTS[index];
        });
        let checkDigit = 11 - (sum % 11);
        // 2桁の場合0、1桁であればそのまま(必ず1桁になるように)
        return (checkDigit >= 10) ? 0 : checkDigit;
    }
    /**
     * 購入番号の有効性をチェックする
     *
     * @param {string} paymentNo
     */
    static isValidPaymentNo(paymentNo) {
        if (paymentNo.length !== 11)
            return false;
        let sequenceNo = Util.decodePaymentNo(paymentNo);
        let checkDigit = Util.getCheckDigit(parseInt(sequenceNo));
        return (parseInt(paymentNo.substr(-1)) === checkDigit);
    }
    static decodePaymentNo(paymentNo) {
        let checkDigit = parseInt(paymentNo.substr(-1));
        let strs = paymentNo.substr(1, paymentNo.length - 2);
        let sortType = Util.SORT_TYPES_PAYMENT_NO[checkDigit];
        let sequeceNo = '';
        for (let i = 0; i < 9; i++) {
            sequeceNo += strs.substr(sortType.indexOf(i), 1);
        }
        return sequeceNo;
    }
}
Util.CHECK_DIGIT_WEIGHTS = [2, 6, 3, 4, 3, 7, 5, 4, 2];
Util.SORT_TYPES_PAYMENT_NO = [
    [5, 0, 2, 3, 7, 6, 1, 8, 4],
    [7, 6, 1, 0, 4, 8, 3, 5, 2],
    [3, 2, 8, 4, 1, 0, 5, 7, 6],
    [0, 1, 3, 8, 7, 2, 6, 5, 4],
    [8, 2, 5, 0, 6, 1, 4, 7, 3],
    [1, 8, 5, 4, 0, 7, 3, 2, 6],
    [2, 3, 8, 6, 5, 7, 1, 0, 4],
    [4, 0, 8, 5, 6, 2, 7, 1, 3],
    [6, 4, 7, 8, 5, 2, 3, 0, 1],
    [7, 2, 4, 8, 0, 3, 5, 6, 1]
];
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Util;
