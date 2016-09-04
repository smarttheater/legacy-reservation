import Util from '../../common/Util/Util';
import PerformanceUtil from '../../common/Models/Performance/PerformanceUtil';

/**
 * パフォーマンス情報モデル
 */
export default class PerformanceStatusesModel {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     */
    public getStatus(id: string): string {
        return (this.hasOwnProperty(id)) ? this[id] : PerformanceUtil.SEAT_STATUS_A;
    }

    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    public setStatus(id: string, status: string): void {
        this[id] = status;
    }

    public save(cb: (err: Error | void) => void) {
        let client = Util.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.setex(key, 3600, JSON.stringify(this), (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    public remove(cb: (err: Error | void) => any) {
        let client = Util.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.del(key, (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    public static find(cb: (err: Error | void, performanceStatusesModel: PerformanceStatusesModel) => any): void {
        let performanceStatusesModel = new PerformanceStatusesModel();
        let client = Util.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.get(key, (err, reply) => {
            client.quit();
            if (err) {
                cb(err, performanceStatusesModel);
            } else {
                if (reply === null) {
                    cb(new Error('Not Found'), performanceStatusesModel);

                } else {
                    // let performanceStatusesModelInRedis = JSON.parse(reply.toString('utf-8'));
                    let performanceStatusesModelInRedis = JSON.parse(reply);
                    for (let propertyName in performanceStatusesModelInRedis) {
                        performanceStatusesModel[propertyName] = performanceStatusesModelInRedis[propertyName];
                    }

                    cb(err, performanceStatusesModel);
                }
            }
        });
    }

    /**
     * ネームスペースを取得
     *
     * @return {string}
     */
    private static getRedisKey(): string {
        return `TIFFPerformanceStatuses`;
    }
}
