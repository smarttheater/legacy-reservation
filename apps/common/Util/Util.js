"use strict";
const crypto = require('crypto');
const fs = require('fs-extra');
const log4js = require('log4js');
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
        return sha512.digest('hex');
    }
    /**
     * 全角→半角変換
     */
    static toHalfWidth(str) {
        return str.split('').map((value) => {
            // 全角であれば変換
            return value.replace(/[Ａ-Ｚａ-ｚ０-９]/g, String.fromCharCode(value.charCodeAt(0) - 0xFEE0));
        }).join('');
    }
    /**
     * 都道府県リスト
     */
    static getPrefectrues() {
        return [
            { code: '01', name: { ja: '北海道', en: '' } },
            { code: '02', name: { ja: '青森県', en: '' } },
            { code: '03', name: { ja: '岩手県', en: '' } },
            { code: '04', name: { ja: '宮城県', en: '' } },
            { code: '05', name: { ja: '秋田県', en: '' } },
            { code: '06', name: { ja: '山形県', en: '' } },
            { code: '07', name: { ja: '福島県', en: '' } },
            { code: '08', name: { ja: '茨城県', en: '' } },
            { code: '09', name: { ja: '栃木県', en: '' } },
            { code: '10', name: { ja: '群馬県', en: '' } },
            { code: '11', name: { ja: '埼玉県', en: '' } },
            { code: '12', name: { ja: '千葉県', en: '' } },
            { code: '13', name: { ja: '東京都', en: '' } },
            { code: '14', name: { ja: '神奈川県', en: '' } },
            { code: '15', name: { ja: '新潟県', en: '' } },
            { code: '16', name: { ja: '富山県', en: '' } },
            { code: '17', name: { ja: '石川県', en: '' } },
            { code: '18', name: { ja: '福井県', en: '' } },
            { code: '19', name: { ja: '山梨県', en: '' } },
            { code: '20', name: { ja: '長野県', en: '' } },
            { code: '21', name: { ja: '岐阜県', en: '' } },
            { code: '22', name: { ja: '静岡県', en: '' } },
            { code: '23', name: { ja: '愛知県', en: '' } },
            { code: '24', name: { ja: '三重県', en: '' } },
            { code: '25', name: { ja: '滋賀県', en: '' } },
            { code: '26', name: { ja: '京都府', en: '' } },
            { code: '27', name: { ja: '大阪府', en: '' } },
            { code: '28', name: { ja: '兵庫県', en: '' } },
            { code: '29', name: { ja: '奈良県', en: '' } },
            { code: '30', name: { ja: '和歌山県', en: '' } },
            { code: '31', name: { ja: '鳥取県', en: '' } },
            { code: '32', name: { ja: '島根県', en: '' } },
            { code: '33', name: { ja: '岡山県', en: '' } },
            { code: '34', name: { ja: '広島県', en: '' } },
            { code: '35', name: { ja: '山口県', en: '' } },
            { code: '36', name: { ja: '徳島県', en: '' } },
            { code: '37', name: { ja: '香川県', en: '' } },
            { code: '38', name: { ja: '愛媛県', en: '' } },
            { code: '39', name: { ja: '高知県', en: '' } },
            { code: '40', name: { ja: '福岡県', en: '' } },
            { code: '41', name: { ja: '佐賀県', en: '' } },
            { code: '42', name: { ja: '長崎県', en: '' } },
            { code: '43', name: { ja: '熊本県', en: '' } },
            { code: '44', name: { ja: '大分県', en: '' } },
            { code: '45', name: { ja: '宮崎県', en: '' } },
            { code: '46', name: { ja: '鹿児島県', en: '' } },
            { code: '47', name: { ja: '沖縄県', en: '' } }
        ];
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Util;
