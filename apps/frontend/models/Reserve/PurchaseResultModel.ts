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
 * 購入結果モデル
 */
export default class PurchaseResultModel {
    /**
     * 購入トークン
     */
    public token: string;

    /**
     * プロセス中の購入情報をセッションに保存する
     * 
     * 有効期間: 3600秒
     */
    public save(cb: (err: Error) => any) {
        let key = PurchaseResultModel.getRedisKey(this.token);
        client.setex(key, 3600, JSON.stringify(this), (err, reply) => {
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションに保存する
     */
    public remove(cb: (err: Error) => any) {
        let key = PurchaseResultModel.getRedisKey(this.token);
        client.del(key, (err, reply) => {
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションから取得する
     */
    public static find(token: string, cb: (err: Error, purchaseResult: PurchaseResultModel) => any): void {
        let key = PurchaseResultModel.getRedisKey(token);
        client.get(key, (err, reply) => {
            if (err) {
                cb(err, null);
            } else {
                if (reply === null) {
                    cb(err, null);

                } else {
                    let purchaseResult = new PurchaseResultModel();
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
        return `PurchaseResult_${token}`;
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
