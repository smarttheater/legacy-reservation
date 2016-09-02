import redis = require('redis');
import conf = require('config');
import crypto = require('crypto');
import fs = require('fs-extra');
import log4js = require('log4js');
import qr = require('qr-image');
import Models from '../../common/models/Models';

/**
 * 共通のユーティリティ
 */
export default class Util {
    /**
     * トークン生成
     *
     * @return {string}
     */
    public static createToken(): string {
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
    public static getRedisClient(): redis.RedisClient {
        let client = redis.createClient(
            conf.get<number>('redis_port'),
            conf.get<string>('redis_host'),
            {
                password: conf.get<string>('redis_key'),
                return_buffers: true
            }
        );

        return client;
    }

    /**
     * 予約IDからQRコードを作成する
     * 
     * @param {string} reservationId 予約ID
     */
    public static createQRCode(reservationId: string): Buffer {
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
    public static getReservationLogger(paymentNo: string, cb: (err: Error, logger: log4js.Logger) => void) {
        let env = process.env.NODE_ENV || 'dev';
        let logDir = `${__dirname}/../../../logs/${env}/reservations/${paymentNo.substr(-1)}`;

        fs.mkdirs(logDir, (err) => {
            if (err) {
                cb(err, null);
            } else {
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
     * チェックディジットを求める
     * 
     * @param {number} source
     */
    public static getCheckDigit(source: number): number {
        let sourceString = source.toString();
        if (sourceString.length !== 9) throw new Error('source length must be 9.'); 

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
    public static isValidPaymentNo(paymentNo: string): boolean {
        if (paymentNo.length !== 10) return false;

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
    public static createHash(password: string, salt: string): string {
        let sha512 = crypto.createHash('sha512');
        sha512.update(salt + password, 'utf8')
        let hash = sha512.digest('hex')

        return hash;
    }

    /**
     * 購入管理番号生成
     */
    public static createPaymentNo(cb: (err: Error, no: string) => void): void {
        Models.Sequence.findOneAndUpdate(
            {target: 'payment_no'},
            {$inc: {no: 1}},
            {new: true},
            (err, sequence) => {
                if (err) {
                    cb(err, null);
                } else {
                    let no: number = sequence.get('no');
                    let random = 1 + Math.floor(Math.random() * 9); // 1-9の整数
                    let checKDigit = Util.getCheckDigit(no);
                    // checkDigitの場所にrandomをはさむ
                    let paymentNo = `${no.toString().substr(0, checKDigit)}${random}${no.toString().substr(checKDigit)}${checKDigit}`;
                    cb(err, paymentNo);
                }
            }
        );
    }
}
