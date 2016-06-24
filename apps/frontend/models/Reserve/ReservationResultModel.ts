import Util from '../../../common/Util/Util';

import mongoose = require('mongoose');

/**
 * 予約結果情報モデル
 */
export default class ReservationResultModel {
    /**
     * 予約トークン
     */
    public token: string;

    /**
     * 購入管理番号
     */
    public paymentNo: string;

    /**
     * パフォーマンス
     */
    public performance: {
        _id: string,
        day: string,
        start_time: string,
        end_time: string,
        /**
         * 劇場
         */
        theater: {
            _id: string,
            name: string,
            name_en: string,
        },
        /**
         * スクリーン
         */
        screen: {
            _id: string,
            name: string,
            name_en: string,
        },
        /**
         * 作品
         */
        film: {
            _id: string,
            name: string,
            name_en: string,
        },
    };

    /**
     * 選択座席コードリスト
     */
    public seatCodes: Array<string>;

    public screenSeatCodes: Array<string>;

    /**
     * 券種選択リスト
     */
    public ticketChoices: Array<{
        seat_code: string,
        ticket: {
            type: string,
            name: string,
            name_en: string,
            price: number
        }
    }>;

    /**
     * プロフィール
     */
    public profile: {
        last_name: string,
        first_name: string,
        email: string,
        tel: string,
    };

    /**
     * 決済方法
     */
    public paymentMethod: string;

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
     * プロセス中の購入情報をセッションから削除する
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
    public static find(token: string, cb: (err: Error, reservationResultModel: ReservationResultModel) => any): void {
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
     * 購入用ネームスペースを取得
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
