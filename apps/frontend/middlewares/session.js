"use strict";
var session = require('express-session');
var conf = require('config');
var connectRedis = require('connect-redis');
var RedisStore = connectRedis(session);
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
