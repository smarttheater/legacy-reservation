"use strict";
const redis = require('redis');
const conf = require('config');
let client = redis.createClient(conf.get('redis_port'), conf.get('redis_host'), {
    password: conf.get('redis_key'),
    tls: { servername: conf.get('redis_host') },
    return_buffers: true
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = client;
