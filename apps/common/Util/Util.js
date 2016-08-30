"use strict";
const redis = require('redis');
const conf = require('config');
const crypto = require('crypto');
const fs = require('fs-extra');
const log4js = require('log4js');
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
        let uniqid = require('uniqid'); // Generates unique id's on multiple processes and machines even if called at the same time.
        let md5hash = crypto.createHash('md5');
        // console.log(uniqid()); // Generate 18 byte unique id's based on the time, process id and mac address. Works on multiple processes and machines.
        // console.log(uniqid.process()); // Generate 12 byte unique id's based on the time and the process id. Works on multiple processes within a single machine but not on multiple machines.
        // console.log(uniqid.time()); // Generate 8 byte unique id's based on the current time only. Recommended only on a single process on a single machine.
        md5hash.update(Math.floor(Math.random() * 10000) + 1000 + uniqid.process(), 'binary');
        // md5hash.update(uniqid.process(), 'binary');
        let token = md5hash.digest('hex');
        return token;
    }
    /**
     * RedisCacheクライアントを取得する
     */
    static getRedisClient() {
        let client = redis.createClient(conf.get('redis_port'), conf.get('redis_host'), {
            password: conf.get('redis_key'),
            return_buffers: true
        });
        return client;
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
                            type: 'dateFile',
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
     * チェックディジットを求める
     *
     * @param {number} source
     */
    static getCheckDigit(source) {
        let sourceString = source.toString();
        if (sourceString.length !== 9)
            throw new Error('source length must be 9.');
        let weights = [2, 6, 3, 4, 3, 7, 5, 4, 2];
        let sum = 0;
        sourceString.split('').reverse().forEach((digitNumber, index) => {
            sum += parseInt(digitNumber) * weights[index];
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
        if (paymentNo.length !== 10)
            return false;
        let sequence = paymentNo.substr(0, paymentNo.length - 1);
        let checkDigit = Util.getCheckDigit(parseInt(sequence));
        return (parseInt(paymentNo.substr(-1)) === checkDigit);
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
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Util;
