import Util from '../../common/Util/Util';

/**
 * パフォーマンス情報モデル
 */
export default class PerformanceStatusesModel {
    public getStatus(id: string): string {
        return (this.hasOwnProperty(id)) ? this[id] : '?';
    }

    public setStatus(id: string, status: string): void {
        this[id] = status;
    }

    public save(cb: (err: Error) => any) {
        let client = Util.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.setex(key, 3600, JSON.stringify(this), (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    public remove(cb: (err: Error) => any) {
        let client = Util.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.del(key, (err, reply) => {
            client.quit();
            cb(err);
        });
    }

    public static find(cb: (err: Error, performanceStatusesModel: PerformanceStatusesModel) => any): void {
        let performanceStatusesModel = new PerformanceStatusesModel();
        let client = Util.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.get(key, (err, reply: Buffer) => {
            client.quit();
            if (err) {
                cb(err, null);
            } else {
                if (reply === null) {
                    cb(err, performanceStatusesModel);

                } else {
                    let performanceStatusesModelInRedis = JSON.parse(reply.toString('utf-8'));
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
