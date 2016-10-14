import Util from '../../common/Util/Util';
import PerformanceUtil from '../../common/Models/Performance/PerformanceUtil';
import redisClient from '../../common/modules/redisClient';

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
        redisClient.setex(PerformanceStatusesModel.getRedisKey(), 3600, JSON.stringify(this), (err) => {
            cb(err);
        });
    }

    public remove(cb: (err: Error | void) => any) {
        redisClient.del(PerformanceStatusesModel.getRedisKey(), (err) => {
            cb(err);
        });
    }

    public static find(cb: (err: Error | void, performanceStatusesModel: PerformanceStatusesModel) => any): void {
        redisClient.get(PerformanceStatusesModel.getRedisKey(), (err, reply) => {
            if (err) return cb(err, null);
            if (reply === null) return cb(new Error('Not Found'), null);

            let performanceStatusesModel = new PerformanceStatusesModel();

            try {
                let performanceStatusesModelInRedis = JSON.parse(reply.toString());
                for (let propertyName in performanceStatusesModelInRedis) {
                    performanceStatusesModel[propertyName] = performanceStatusesModelInRedis[propertyName];
                }
            } catch (error) {
                return cb(error, null);
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
        return `TIFFSeatStatusesByPerformanceId`;
    }
}
