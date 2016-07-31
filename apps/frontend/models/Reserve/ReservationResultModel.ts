import Util from '../../../common/Util/Util';

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
        is_mx4d: boolean, // MX4D上映かどうか
        theater: {
            _id: string,
            name: string,
            name_en: string,
        },
        screen: {
            _id: string,
            name: string,
            name_en: string,
            sections: Array<{
                seats: Array<{
                    code: string, // 座席コード
                    grade: {
                        name: string, // 座席レベル名
                        name_en: string, // 座席レベル名(英語)
                        additional_charge: Number // 追加料金
                    }
                }>
            }>
        },
        film: {
            _id: string,
            name: string,
            name_en: string,
            image: string
        },
    };

    /**
     * 券種リスト
     */
    public ticketTypes: Array<
         {
            code: string,
            name: string, // 券種名
            name_en: string, // 券種名(英語)
            charge: number, // 料金
            is_on_the_day: boolean // 当日だけフラグ
        }
    >;

    /**
     * 予約IDリスト
     */
    public reservations: Array<Object>;

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
     * メルマガ当選者
     */
    public member: {
        _id: string;
        user_id: string;
    };

    /**
     * 内部関係者
     */
    public staff: {
        _id: string;
        user_id: string;
        name: string;
        email: string;
        department_name: string;
        tel: string;
        signature: string;
    };

    /**
     * 外部関係者
     */
    public sponsor: {
        _id: string;
        user_id: string;
        name: string;
        email: string;
    };

    public reservedDocuments: Array<any>;

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
     * ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    private static getRedisKey(token): string {
        return `TIFFReservationResult_${token}`;
    }

    /**
     * ログ用の形式にする
     */
    public toLog(): Object {
        let log = this;

        return log;
    }
}
