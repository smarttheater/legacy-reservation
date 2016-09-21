"use strict";
const PerformanceUtil_1 = require('../../common/Models/Performance/PerformanceUtil');
const redisClient_1 = require('../../common/modules/redisClient');
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
        let key = PerformanceStatusesModel.getRedisKey();
        redisClient_1.default.setex(key, 3600, JSON.stringify(this), (err) => {
            cb(err);
        });
    }
    remove(cb) {
        let key = PerformanceStatusesModel.getRedisKey();
        redisClient_1.default.del(key, (err) => {
            cb(err);
        });
    }
    static find(cb) {
        let key = PerformanceStatusesModel.getRedisKey();
        redisClient_1.default.get(key, (err, reply) => {
            if (err)
                return cb(err, null);
            if (reply === null)
                return cb(new Error('Not Found'), null);
            let performanceStatusesModel = new PerformanceStatusesModel();
            try {
                let performanceStatusesModelInRedis = JSON.parse(reply.toString());
                for (let propertyName in performanceStatusesModelInRedis) {
                    performanceStatusesModel[propertyName] = performanceStatusesModelInRedis[propertyName];
                }
            }
            catch (error) {
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
    static getRedisKey() {
        return `TIFFPerformanceStatuses`;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceStatusesModel;
