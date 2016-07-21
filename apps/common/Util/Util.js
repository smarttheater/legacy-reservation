"use strict";
var redis = require('redis');
var conf = require('config');
var uniqid = require('uniqid');
/**
 * 共通のユーティリティ
 */
var Util = (function () {
    function Util() {
    }
    /**
     * トークン生成
     *
     * @return {string}
     */
    // public static createToken(): string {
    //     let uniqid = require('uniqid'); // Generates unique id's on multiple processes and machines even if called at the same time.
    //     let md5hash = crypto.createHash('md5');
    //     // console.log(uniqid()); // Generate 18 byte unique id's based on the time, process id and mac address. Works on multiple processes and machines.
    //     // console.log(uniqid.process()); // Generate 12 byte unique id's based on the time and the process id. Works on multiple processes within a single machine but not on multiple machines.
    //     // console.log(uniqid.time()); // Generate 8 byte unique id's based on the current time only. Recommended only on a single process on a single machine.
    //     md5hash.update(Math.floor(Math.random() * 10000) + 1000 + uniqid.time(), 'binary');
    //     // md5hash.update(uniqid.process(), 'binary');
    //     let token = md5hash.digest('hex');
    //     // let token = md5hash.digest('base64');
    //     return token;
    // }
    /**
     * トークン生成(24桁)
     *
     * @return {string}
     */
    Util.createToken = function () {
        var uniq = uniqid();
        var size = 24 - uniq.length;
        var base = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var baseLength = base.length;
        var buf = [];
        for (var i = 0; i < size; i++) {
            buf.push(base[Math.floor(Math.random() * baseLength)]);
        }
        var token = buf.join('') + uniq;
        return buf.join('') + uniq;
    };
    /**
     * 購入管理番号生成
     * TODO 生成方法考える
     *
     * @return {string}
     */
    Util.createPaymentNo = function () {
        var no = "" + (Math.floor(Math.random() * 10000) + 1000) + (Math.floor(Math.random() * 10000) + 1000);
        return no;
    };
    /**
     * RedisCacheクライアントを取得する
     */
    Util.getRedisClient = function () {
        var client = redis.createClient(conf.get('redis_port'), conf.get('redis_host'), {
            password: conf.get('redis_key'),
            return_buffers: true
        });
        return client;
    };
    return Util;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Util;
