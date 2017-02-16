"use strict";
const conf = require("config");
const connectRedis = require("connect-redis");
const session = require("express-session");
const redis = require("redis");
const redisStore = connectRedis(session);
const COOKIE_MAX_AGE = 3600000; // 60 * 60 * 1000(session active 1 hour)
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = session({
    secret: 'TTTSFrontendSecret',
    resave: false,
    rolling: true,
    saveUninitialized: false,
    store: new redisStore({
        client: redis.createClient(conf.get('redis_port'), conf.get('redis_host'), {
            password: conf.get('redis_key'),
            tls: { servername: conf.get('redis_host') },
            return_buffers: true
        })
    }),
    cookie: {
        maxAge: COOKIE_MAX_AGE
    }
});
