import crypto = require('crypto');
import fs = require('fs-extra');
import log4js = require('log4js');
import qr = require('qr-image');
import uniqid = require('uniqid');
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
        let md5hash = crypto.createHash('md5');

        // console.log(uniqid()); // Generate 18 byte unique id's based on the time, process id and mac address. Works on multiple processes and machines.
        // console.log(uniqid.process()); // Generate 12 byte unique id's based on the time and the process id. Works on multiple processes within a single machine but not on multiple machines.
        // console.log(uniqid.time()); // Generate 8 byte unique id's based on the current time only. Recommended only on a single process on a single machine.

        md5hash.update(Math.floor(Math.random() * 10000) + 1000 + uniqid.process(), 'binary');

        let token = md5hash.digest('hex');

        return token;
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

                    // sortTypes[checkDigit]で並べ替える
                    let sortType = Util.SORT_TYPES_PAYMENT_NO[checKDigit];
                    let paymentNo = random + sortType.map((index) => {return no.toString().substr(index, 1)}).join('') + checKDigit.toString();
                    cb(err, paymentNo);
                }
            }
        );
    }

    /**
     * チェックディジットを求める
     * 
     * @param {number} source
     */
    public static getCheckDigit(source: number): number {
        let sourceString = source.toString();
        if (sourceString.length !== 9) throw new Error('source length must be 9.'); 

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
    public static isValidPaymentNo(paymentNo: string): boolean {
        if (paymentNo.length !== 11) return false;

        let sequenceNo = Util.decodePaymentNo(paymentNo);
        let checkDigit = Util.getCheckDigit(parseInt(sequenceNo));

        return (parseInt(paymentNo.substr(-1)) === checkDigit);
    }

    public static decodePaymentNo(paymentNo: string): string {
        let checkDigit = parseInt(paymentNo.substr(-1));
        let strs = paymentNo.substr(1, paymentNo.length - 2);
        let sortType = Util.SORT_TYPES_PAYMENT_NO[checkDigit];
        let sequeceNo = '';
        for (let i = 0; i < 9; i++) {
            sequeceNo += strs.substr(sortType.indexOf(i), 1)
        }

        return sequeceNo;
    }

    public static CHECK_DIGIT_WEIGHTS = [2, 6, 3, 4, 3, 7, 5, 4, 2];

    public static SORT_TYPES_PAYMENT_NO = [
        [ 5, 0, 2, 3, 7, 6, 1, 8, 4 ],
        [ 7, 6, 1, 0, 4, 8, 3, 5, 2 ],
        [ 3, 2, 8, 4, 1, 0, 5, 7, 6 ],
        [ 0, 1, 3, 8, 7, 2, 6, 5, 4 ],
        [ 8, 2, 5, 0, 6, 1, 4, 7, 3 ],
        [ 1, 8, 5, 4, 0, 7, 3, 2, 6 ],
        [ 2, 3, 8, 6, 5, 7, 1, 0, 4 ],
        [ 4, 0, 8, 5, 6, 2, 7, 1, 3 ],
        [ 6, 4, 7, 8, 5, 2, 3, 0, 1 ],
        [ 7, 2, 4, 8, 0, 3, 5, 6, 1 ]
    ];
}
