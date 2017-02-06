import session = require("express-session");
import redis = require("redis");
import conf = require("config");
import connectRedis = require("connect-redis");
let RedisStore = connectRedis(session);

export default session({
    secret: "TTTSFrontendSecret",
    resave: false,
    rolling: true, // Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown.
    saveUninitialized: false,
    store: new RedisStore({
        client: redis.createClient(
            conf.get<number>("redis_port"),
            conf.get<string>("redis_host"),
            {
                password: conf.get<string>("redis_key"),
                tls: { servername: conf.get<string>("redis_host") },
                return_buffers: true
            }
        )
    }),
    cookie: {
        maxAge: 60 * 60 * 1000 // session active 1 hour
    }
});
