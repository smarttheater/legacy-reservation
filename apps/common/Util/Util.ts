import crypto = require('crypto');
import fs = require('fs-extra');
import log4js = require('log4js');
import uniqid = require('uniqid');
import Models from '../../common/models/Models';

/**
 * 共通ユーティリティ
 */
export default class Util {
    /**
     * ミリ秒とプロセスに対してユニークなトークンを生成する
     */
    public static createToken(): string {
        let md5hash = crypto.createHash('md5');
        // console.log(uniqid()); // Generate 18 byte unique id's based on the time, process id and mac address. Works on multiple processes and machines.
        // console.log(uniqid.process()); // Generate 12 byte unique id's based on the time and the process id. Works on multiple processes within a single machine but not on multiple machines.
        // console.log(uniqid.time()); // Generate 8 byte unique id's based on the current time only. Recommended only on a single process on a single machine.
        md5hash.update(Math.floor(Math.random() * 10000) + 1000 + uniqid.process(), 'binary');
        return md5hash.digest('hex');
    }

    /**
     * 予約プロセス用のロガーを設定する
     * 1ログファイル per 1購入番号
     * 
     * @param {string} paymentNo 購入番号
     */
    public static getReservationLogger(paymentNo: string, cb: (err: Error, logger: log4js.Logger) => void) {
        let env = process.env.NODE_ENV || 'dev';
        let logDir = `${__dirname}/../../../logs/${env}/reservations/${paymentNo.substr(-1)}`;

        fs.mkdirs(logDir, (err) => {
            if (err) return cb(err, null);

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
    public static createHash(password: string, salt: string): string {
        let sha512 = crypto.createHash('sha512');
        sha512.update(salt + password, 'utf8');
        return sha512.digest('hex');
    }
}
