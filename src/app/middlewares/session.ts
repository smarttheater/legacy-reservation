/**
 * セッションミドルウェア
 *
 * @module sessionMiddleware
 */

import * as connectRedis from 'connect-redis';
import * as session from 'express-session';
import * as redis from 'redis';
const redisStore = connectRedis(session);
const COOKIE_MAX_AGE = 3600000; // 60 * 60 * 1000(session active 1 hour)

const HOST = process.env.REDIS_HOST;
const PORT = process.env.REDIS_PORT;
const KEY = process.env.REDIS_KEY;
if (HOST === undefined || PORT === undefined || KEY === undefined) {
    throw new Error('Environment variables REDIS_HOST, REDIS_PORT, REDIS_KEY are required for managing session. Please set them.');
}

export default session({
    secret: 'LegacyReservation',
    resave: false,
    // Force a session identifier cookie to be set on every response.
    // The expiration is reset to the original maxAge, resetting the expiration countdown.
    rolling: true,
    saveUninitialized: false,
    store: new redisStore({
        client: redis.createClient({
            port: Number(<string>process.env.REDIS_PORT),
            host: <string>process.env.REDIS_HOST,
            password: <string>process.env.REDIS_KEY,
            tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
        }
            // tslint:disable-next-line:no-magic-numbers
            // parseInt(PORT, 10),
            // HOST,
            // {
            //     password: KEY,
            //     tls: { servername: HOST },
            //     return_buffers: true
            // }
        )
    }),
    cookie: {
        maxAge: COOKIE_MAX_AGE
    }
});
