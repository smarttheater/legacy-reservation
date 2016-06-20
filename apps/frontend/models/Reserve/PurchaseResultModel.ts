import Util from '../../../common/Util/Util';

import Models from '../../../common/mongooseModels/Models';

import mongoose = require('mongoose');

/**
 * 予約結果モデル
 */
export default class ReservationResultModel {
    /**
     * トークン
     */
    public token: string;

    /**
     * プロセス中の購入情報をセッションに保存する
     * 
     * 有効期間: 3600秒
     */
    public save(cb: (err: Error) => any) {
        let client = Util.getRedisClient();
        let key = ReservationResultModel.getRedisKey(this.token);
        client.setex(key, 3600, JSON.stringify(this), (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションに保存する
     */
    public remove(cb: (err: Error) => any) {
        let client = Util.getRedisClient();
        let key = ReservationResultModel.getRedisKey(this.token);
        client.del(key, (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションから取得する
     */
    public static find(token: string, cb: (err: Error, purchaseResult: ReservationResultModel) => any): void {
        let client = Util.getRedisClient();
        let key = ReservationResultModel.getRedisKey(token);
        client.get(key, (err, reply) => {
            client.quit();

            if (err) {
                cb(err, null);
            } else {
                if (reply === null) {
                    cb(err, null);

                } else {
                    let purchaseResult = new ReservationResultModel();
                    let purchaseInfoInRedis = JSON.parse(reply);
                    for (let propertyName in purchaseInfoInRedis) {
                        purchaseResult[propertyName] = purchaseInfoInRedis[propertyName];
                    }

                    cb(err, purchaseResult);
                }
            }
        });
    }

    /**
     * 購入結果用ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    private static getRedisKey(token): string {
        return `TIFFReservationResult_${token}`;
    }

    /**
     * 購入ログ用の形式にする
     */
    public toLog(): Object {
        let log = {
            token: this.token
        };

        return log;
    }
}
