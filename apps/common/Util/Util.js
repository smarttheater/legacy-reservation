"use strict";
const redis = require('redis');
const conf = require('config');
const uniqid = require('uniqid');
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
    // public static createToken(): string {
    //     let uniqid = require('uniqid'); // Generates unique id's on multiple processes and machines even if called at the same time.
    //     let md5hash = crypto.createHash('md5');
    //     // console.log(uniqid()); // Generate 18 byte unique id's based on the time, process id and mac address. Works on multiple processes and machines.
    //     // console.log(uniqid.process()); // Generate 12 byte unique id's based on the time and the process id. Works on multiple processes within a single machine but not on multiple machines.
    //     // console.log(uniqid.time()); // Generate 8 byte unique id's based on the current time only. Recommended only on a single process on a single machine.
    //     md5hash.update(Math.floor(Math.random() * 10000) + 1000 + uniqid.time(), 'binary');
    //     // md5hash.update(uniqid.process(), 'binary');
    //     let token = md5hash.digest('hex');
    //     // let token = md5hash.digest('base64');
    //     return token;
    // }
    /**
     * トークン生成(24桁)
     *
     * @return {string}
     */
    static createToken() {
        let uniq = uniqid();
        let size = 24 - uniq.length;
        let base = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var baseLength = base.length;
        let buf = [];
        for (let i = 0; i < size; i++) {
            buf.push(base[Math.floor(Math.random() * baseLength)]);
        }
        let token = buf.join('') + uniq;
        return buf.join('') + uniq;
    }
    /**
     * 購入管理番号生成
     * TODO 生成方法考える
     *
     * @return {string}
     */
    static createPaymentNo() {
        let no = `${Math.floor(Math.random() * 10000) + 1000}${Math.floor(Math.random() * 10000) + 1000}`;
        return no;
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
        let moment = require('moment');
        let logDir = `${__dirname}/../../../logs/${env}/reservations/${moment().format('YYYYMMDD')}`;
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
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Util;
