import session = require('express-session');
import conf = require('config');

let RedisStore = require('connect-redis')(session);

export default session({
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
