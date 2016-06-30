import ReservationResultModel from './ReservationResultModel';
import Util from '../../../common/Util/Util';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';

/**
 * 予約キャンセルモデル
 */
export default class ReservationCancelModel {
    /**
     * 予約キャンセルトークン
     */
    public token: string;

    /**
     * 予約番号
     */
    public paymentNo: string;

    /**
     * プロセス中の購入情報をセッションに保存する
     * 
     * 有効期間: 3600秒
     */
    public save(cb: (err: Error) => any) {
        let client = Util.getRedisClient();
        let key = ReservationCancelModel.getRedisKey(this.token);
        client.setex(key, 3600, JSON.stringify(this), (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションから削除する
     */
    public remove(cb: (err: Error) => any) {
        let client = Util.getRedisClient();
        let key = ReservationCancelModel.getRedisKey(this.token);
        client.del(key, (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    /**
     * プロセス中の購入情報をセッションから取得する
     */
    public static find(token: string, cb: (err: Error, reservationCancelModel: ReservationCancelModel) => any): void {
        let client = Util.getRedisClient();
        let key = ReservationCancelModel.getRedisKey(token);
        client.get(key, (err, reply) => {
            client.quit();

            if (err) {
                cb(err, null);
            } else {
                if (reply === null) {
                    cb(err, null);

                } else {
                    let reservationCancelModel = new ReservationCancelModel();
                    let reservationCancelModelInRedis = JSON.parse(reply);
                    for (let propertyName in reservationCancelModelInRedis) {
                        reservationCancelModel[propertyName] = reservationCancelModelInRedis[propertyName];
                    }

                    cb(err, reservationCancelModel);
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
        return `TIFFReservationCancel_${token}`;
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
