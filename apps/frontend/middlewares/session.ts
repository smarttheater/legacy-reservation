import session = require('express-session');
import redisClient from '../../common/modules/redisClient';
import connectRedis = require('connect-redis');
let RedisStore = connectRedis(session);

export default session({
    secret: 'TIFFFrontendSecret', 
    resave: false,
    rolling: true, // Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown.
    saveUninitialized: false,
    store: new RedisStore({
        client: redisClient
    }),
    cookie: {
        maxAge: 60 * 60 * 1000 // session active 1 hour
    }
});
