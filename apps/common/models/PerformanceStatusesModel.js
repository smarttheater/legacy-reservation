"use strict";
const PerformanceUtil_1 = require("../../common/models/Performance/PerformanceUtil");
const redisClient_1 = require("../../common/modules/redisClient");
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
        redisClient_1.default.setex(PerformanceStatusesModel.getRedisKey(), 3600, JSON.stringify(this), (err) => {
            cb(err);
        });
    }
    remove(cb) {
        redisClient_1.default.del(PerformanceStatusesModel.getRedisKey(), (err) => {
            cb(err);
        });
    }
    static find(cb) {
        redisClient_1.default.get(PerformanceStatusesModel.getRedisKey(), (err, reply) => {
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
        return `TTTSSeatStatusesByPerformanceId`;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceStatusesModel;
