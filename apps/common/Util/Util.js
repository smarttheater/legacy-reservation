"use strict";
const crypto = require('crypto');
const fs = require('fs-extra');
const log4js = require('log4js');
const qr = require('qr-image');
const uniqid = require('uniqid');
/**
 * 共通ユーティリティ
 */
class Util {
    /**
     * ミリ秒とプロセスに対してユニークなトークンを生成する
     */
    static createToken() {
        let md5hash = crypto.createHash('md5');
        // console.log(uniqid()); // Generate 18 byte unique id's based on the time, process id and mac address. Works on multiple processes and machines.
        // console.log(uniqid.process()); // Generate 12 byte unique id's based on the time and the process id. Works on multiple processes within a single machine but not on multiple machines.
        // console.log(uniqid.time()); // Generate 8 byte unique id's based on the current time only. Recommended only on a single process on a single machine.
        md5hash.update(Math.floor(Math.random() * 10000) + 1000 + uniqid.process(), 'binary');
        return md5hash.digest('hex');
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
     * 1ログファイル per 1購入番号
     *
     * @param {string} paymentNo 購入番号
     */
    static getReservationLogger(paymentNo, cb) {
        let env = process.env.NODE_ENV || 'dev';
        let logDir = `${__dirname}/../../../logs/${env}/reservations/${paymentNo.substr(-1)}`;
        fs.mkdirs(logDir, (err) => {
            if (err)
                return cb(err, null);
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
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Util;
