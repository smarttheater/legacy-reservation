"use strict";
const Util_1 = require('../../common/Util/Util');
const session = require('express-session');
const connectRedis = require('connect-redis');
let RedisStore = connectRedis(session);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = session({
    secret: 'TIFFFrontendSecret',
    resave: false,
    rolling: true,
    saveUninitialized: false,
    store: new RedisStore({
        client: Util_1.default.getRedisClient()
    }),
    cookie: {
        maxAge: 60 * 60 * 1000 // session active 1 hour
    }
});
