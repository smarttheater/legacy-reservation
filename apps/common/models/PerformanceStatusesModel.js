"use strict";
const Util_1 = require('../../common/Util/Util');
const PerformanceUtil_1 = require('../../common/Models/Performance/PerformanceUtil');
/**
 * パフォーマンス情報モデル
 */
class PerformanceStatusesModel {
    /**
     * パフォーマンスIDから空席ステータスを取得する
     */
    getStatus(id) {
        return (this.hasOwnProperty(id)) ? this[id] : PerformanceUtil_1.default.SEAT_STATUS_A;
    }
    /**
     * パフォーマンスIDの空席ステータスをセットする
     */
    setStatus(id, status) {
        this[id] = status;
    }
    save(cb) {
        let client = Util_1.default.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.setex(key, 3600, JSON.stringify(this), (err) => {
            client.quit();
            cb(err);
        });
    }
    remove(cb) {
        let client = Util_1.default.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.del(key, (err) => {
            client.quit();
            cb(err);
        });
    }
    static find(cb) {
        let client = Util_1.default.getRedisClient();
        let key = PerformanceStatusesModel.getRedisKey();
        client.get(key, (err, reply) => {
            client.quit();
            if (err)
                return cb(err, null);
            if (reply === null)
                return cb(new Error('Not Found'), null);
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
    static getRedisKey() {
        return `TIFFPerformanceStatuses`;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceStatusesModel;
