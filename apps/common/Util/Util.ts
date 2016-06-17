import redis = require('redis');
import conf = require('config');

/**
 * ムビチケ共通のユーティリティ
 */
export default class Util {
    /**
     * トークン生成
     *
     * @return {string}
     */
    public static createToken(): string {
        let crypto = require('crypto');
        let uniqid = require('uniqid'); // Generates unique id's on multiple processes and machines even if called at the same time.

        var md5hash = crypto.createHash('md5');

        // console.log(uniqid()); // Generate 18 byte unique id's based on the time, process id and mac address. Works on multiple processes and machines.
        // console.log(uniqid.process()); // Generate 12 byte unique id's based on the time and the process id. Works on multiple processes within a single machine but not on multiple machines.
        // console.log(uniqid.time()); // Generate 8 byte unique id's based on the current time only. Recommended only on a single process on a single machine.
        // md5hash.update(Math.floor( Math.random() * 10000 ) + 1000 + uniqid(), 'binary');
        md5hash.update(uniqid.process(), 'binary');

        let token = md5hash.digest('hex');
        return token;
    }

    public static getRedisClient(): redis.RedisClient {
        let client = redis.createClient(
            conf.get<number>('redis_port'),
            conf.get<string>('redis_host'),
            {
                password: conf.get<string>('redis_key')
            }
        );

        return client;
    }
}
