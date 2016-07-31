"use strict";
const Util_1 = require('../../../common/Util/Util');
/**
 * 予約結果情報モデル
 */
class ReservationResultModel {
    /**
     * プロセス中の購入情報をセッションに保存する
     *
     * 有効期間: 3600秒
     */
    save(cb) {
        let client = Util_1.default.getRedisClient();
        let key = ReservationResultModel.getRedisKey(this.token);
        client.setex(key, 3600, JSON.stringify(this), (err, reply) => {
            client.quit();
            cb(err);
        });
    }
    /**
     * プロセス中の購入情報をセッションから削除する
     */
    remove(cb) {
        let client = Util_1.default.getRedisClient();
        let key = ReservationResultModel.getRedisKey(this.token);
        client.del(key, (err, reply) => {
            client.quit();
            cb(err);
        });
    }
    /**
     * プロセス中の購入情報をセッションから取得する
     */
    static find(token, cb) {
        let client = Util_1.default.getRedisClient();
        let key = ReservationResultModel.getRedisKey(token);
        client.get(key, (err, reply) => {
            client.quit();
            if (err) {
                cb(err, null);
            }
            else {
                if (reply === null) {
                    cb(err, null);
                }
                else {
                    let reservationResultModel = new ReservationResultModel();
                    let reservationModelInRedis = JSON.parse(reply);
                    for (let propertyName in reservationModelInRedis) {
                        reservationResultModel[propertyName] = reservationModelInRedis[propertyName];
                    }
                    cb(err, reservationResultModel);
                }
            }
        });
    }
    /**
     * ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    static getRedisKey(token) {
        return `TIFFReservationResult_${token}`;
    }
    /**
     * ログ用の形式にする
     */
    toLog() {
        let log = this;
        return log;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationResultModel;
