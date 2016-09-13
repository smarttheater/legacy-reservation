"use strict";
const session = require("express-session");
const redisClient_1 = require("../../common/modules/redisClient");
const connectRedis = require("connect-redis");
let RedisStore = connectRedis(session);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = session({
    secret: 'TIFFFrontendSecret',
    resave: false,
    rolling: true,
    saveUninitialized: false,
    store: new RedisStore({
        client: redisClient_1.default
    }),
    cookie: {
        maxAge: 60 * 60 * 1000 // session active 1 hour
    }
});
