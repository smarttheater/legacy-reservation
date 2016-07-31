"use strict";
const session = require('express-session');
const conf = require('config');
const connectRedis = require('connect-redis');
let RedisStore = connectRedis(session);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = session({
    secret: 'TIFFFrontendSecret',
    resave: false,
    rolling: true,
    saveUninitialized: false,
    store: new RedisStore({
        host: conf.get('redis_host'),
        port: conf.get('redis_port'),
        pass: conf.get('redis_key')
    }),
    cookie: {
        maxAge: 60 * 60 * 1000
    }
});
