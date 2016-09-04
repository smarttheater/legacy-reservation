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
        client.setex(key, 3600, JSON.stringify(this), (err) => {
            client.quit();
            cb(err);
        });
    }

    public remove(cb: (err: Error | void) => any) {
        let client = Util.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.del(key, (err) => {
            client.quit();
            cb(err);
        });
    }

    public static find(cb: (err: Error | void, performanceStatusesModel: PerformanceStatusesModel) => any): void {
        let client = Util.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.get(key, (err, reply) => {
            client.quit();

            if (err) return cb(err, null);
            if (reply === null) return cb(new Error('Not Found'), null);

            let performanceStatusesModel = new PerformanceStatusesModel();
            let performanceStatusesModelInRedis = JSON.parse(reply.toString());
            for (let propertyName in performanceStatusesModelInRedis) {
                performanceStatusesModel[propertyName] = performanceStatusesModelInRedis[propertyName];
            }

            cb(null, performanceStatusesModel);
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
