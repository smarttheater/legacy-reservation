import PurchaseResultModel from './PurchaseResultModel';
import redis = require('redis');
import conf = require('config');
let client = redis.createClient(
    conf.get<number>('redis_port'),
    conf.get<string>('redis_host'),
    {
        password: conf.get<string>('redis_key')
    }
);

/**
 * 購入情報モデル
 * 
 * 購入プロセス中の情報を全て管理するためのモデルです
 * この情報をセッションで引き継くことで、購入プロセスを管理しています
 */
export default class PurchaseInfoModel {
    /**
     * 決済トークン
     */
    public token: string;

    /**
     * プロセス中の購入情報をセッションに保存する
     * 
     * 有効期間: 3600秒
     */
    public save(cb: (err: Error) => any) {
        let key = PurchaseInfoModel.getRedisKey(this.token);
        client.setex(key, 3600, JSON.stringify(this), (err, reply) => {
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションに保存する
     */
    public remove(cb: (err: Error) => any) {
        let key = PurchaseInfoModel.getRedisKey(this.token);
        client.del(key, (err, reply) => {
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションから取得する
     */
    public static find(token: string, cb: (err: Error, purchaseInfo: PurchaseInfoModel) => any): void {
        let key = PurchaseInfoModel.getRedisKey(token);
        client.get(key, (err, reply) => {
            if (err) {
                cb(err, null);
            } else {
                if (reply === null) {
                    cb(err, null);

                } else {
                    let purchaseInfo = new PurchaseInfoModel();
                    let purchaseInfoInRedis = JSON.parse(reply);
                    for (let propertyName in purchaseInfoInRedis) {
                        purchaseInfo[propertyName] = purchaseInfoInRedis[propertyName];
                    }

                    cb(err, purchaseInfo);
                }
            }
        });
    }

    /**
     * 購入用ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    private static getRedisKey(token): string {
        return `PurchaseInfo_${token}`;
    }

    /**
     * 購入結果モデルへ変換
     */
    public toPurchaseResult(): PurchaseResultModel {
        let purchaseResult = new PurchaseResultModel();

        purchaseResult.token = this.token;

        return purchaseResult;
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
