"use strict";
var Util_1 = require('../../common/Util/Util');
/**
 * パフォーマンス情報モデル
 */
var PerformanceStatusesModel = (function () {
    function PerformanceStatusesModel() {
    }
    PerformanceStatusesModel.prototype.getStatus = function (id) {
        return (this.hasOwnProperty(id)) ? this[id] : '?';
    };
    PerformanceStatusesModel.prototype.setStatus = function (id, status) {
        this[id] = status;
    };
    PerformanceStatusesModel.prototype.save = function (cb) {
        var client = Util_1.default.getRedisClient();
        var key = PerformanceStatusesModel.getRedisKey();
        client.setex(key, 3600, JSON.stringify(this), function (err, reply) {
            client.quit();
            cb(err);
        });
    };
    PerformanceStatusesModel.prototype.remove = function (cb) {
        var client = Util_1.default.getRedisClient();
        var key = PerformanceStatusesModel.getRedisKey();
        client.del(key, function (err, reply) {
            client.quit();
            cb(err);
        });
    };
    PerformanceStatusesModel.find = function (cb) {
        var performanceStatusesModel = new PerformanceStatusesModel();
        var client = Util_1.default.getRedisClient();
        var key = PerformanceStatusesModel.getRedisKey();
        client.get(key, function (err, reply) {
            client.quit();
            if (err) {
                cb(err, null);
            }
            else {
                if (reply === null) {
                    cb(err, performanceStatusesModel);
                }
                else {
                    var performanceStatusesModelInRedis = JSON.parse(reply.toString('utf-8'));
                    for (var propertyName in performanceStatusesModelInRedis) {
                        performanceStatusesModel[propertyName] = performanceStatusesModelInRedis[propertyName];
                    }
                    cb(err, performanceStatusesModel);
                }
            }
        });
    };
    /**
     * ネームスペースを取得
     *
     * @return {string}
     */
    PerformanceStatusesModel.getRedisKey = function () {
        return "TIFFPerformanceStatuses";
    };
    return PerformanceStatusesModel;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceStatusesModel;
