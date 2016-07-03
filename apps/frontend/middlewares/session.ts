import session = require('express-session');
import conf = require('config');
import connectRedis = require('connect-redis');

let RedisStore = connectRedis(session);

export default session({
    secret: 'TIFFFrontendSecret', 
    resave: false,
    rolling: true,
    saveUninitialized: false,
    store: new RedisStore({
        host: conf.get<string>('redis_host'),
        port: conf.get<number>('redis_port'),
        pass: conf.get<string>('redis_key')
    }),
    cookie: {
        maxAge: 60 * 60 * 1000
    }
});
