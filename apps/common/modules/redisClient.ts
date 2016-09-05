import redis = require('redis');
import conf = require('config');

let client = redis.createClient(
    conf.get<number>('redis_port'),
    conf.get<string>('redis_host'),
    {
        password: conf.get<string>('redis_key'),
        tls: {servername: conf.get<string>('redis_host')},
        return_buffers: true
    }
);

export default client;
