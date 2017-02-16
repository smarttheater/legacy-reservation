import * as conf from 'config';
import * as connectRedis from 'connect-redis';
import * as session from 'express-session';
import * as redis from 'redis';
const redisStore = connectRedis(session);
const COOKIE_MAX_AGE = 3600000; // 60 * 60 * 1000(session active 1 hour)

export default session({
    secret: 'TTTSFrontendSecret',
    resave: false,
    rolling: true, // Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown.
    saveUninitialized: false,
    store: new redisStore({
        client: redis.createClient(
            conf.get<number>('redis_port'),
            conf.get<string>('redis_host'),
            {
                password: conf.get<string>('redis_key'),
                tls: { servername: conf.get<string>('redis_host') },
                return_buffers: true
            }
        )
    }),
    cookie: {
        maxAge: COOKIE_MAX_AGE
    }
});
