"use strict";
var Util_1 = require('../../../common/Util/Util');
/**
 * 予約結果情報モデル
 */
var ReservationResultModel = (function () {
    function ReservationResultModel() {
    }
    /**
     * プロセス中の購入情報をセッションに保存する
     *
     * 有効期間: 3600秒
     */
    ReservationResultModel.prototype.save = function (cb) {
        var client = Util_1.default.getRedisClient();
        var key = ReservationResultModel.getRedisKey(this.token);
        client.setex(key, 3600, JSON.stringify(this), function (err, reply) {
            client.quit();
            cb(err);
        });
    };
    /**
     * プロセス中の購入情報をセッションから削除する
     */
    ReservationResultModel.prototype.remove = function (cb) {
        var client = Util_1.default.getRedisClient();
        var key = ReservationResultModel.getRedisKey(this.token);
        client.del(key, function (err, reply) {
            client.quit();
            cb(err);
        });
    };
    /**
     * プロセス中の購入情報をセッションから取得する
     */
    ReservationResultModel.find = function (token, cb) {
        var client = Util_1.default.getRedisClient();
        var key = ReservationResultModel.getRedisKey(token);
        client.get(key, function (err, reply) {
            client.quit();
            if (err) {
                cb(err, null);
            }
            else {
                if (reply === null) {
                    cb(err, null);
                }
                else {
                    var reservationResultModel = new ReservationResultModel();
                    var reservationModelInRedis = JSON.parse(reply);
                    for (var propertyName in reservationModelInRedis) {
                        reservationResultModel[propertyName] = reservationModelInRedis[propertyName];
                    }
                    cb(err, reservationResultModel);
                }
            }
        });
    };
    /**
     * ネームスペースを取得
     *
     * @param {string} token
     * @return {string}
     */
    ReservationResultModel.getRedisKey = function (token) {
        return "TIFFReservationResult_" + token;
    };
    /**
     * ログ用の形式にする
     */
    ReservationResultModel.prototype.toLog = function () {
        var log = this;
        return log;
    };
    return ReservationResultModel;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationResultModel;
