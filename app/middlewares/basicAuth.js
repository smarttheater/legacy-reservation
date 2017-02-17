/**
 * ベーシック認証ミドルウェア
 *
 * @module basicAuthMiddleware
 */
"use strict";
const basicAuth = require("basic-auth");
const STATUS_CODE_UNAUTHORIZED = 401;
const BASIC_AUTH_NAME = 'motionpicture';
const BASIC_AUTH_PASS = '4_CS/T|YG*Lz';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req, res, next) => {
    if (process.env.NODE_ENV === 'dev')
        return next();
    if (process.env.NODE_ENV === 'prod')
        return next();
    if (process.env.NODE_ENV === 'test')
        return next();
    if (process.env.NODE_ENV === 'dev4gmo')
        return next(); // GMO結果通知に対してはオープンにする
    if (process.env.NODE_ENV === 'test4gmo')
        return next(); // GMO結果通知に対してはオープンにする
    if (process.env.NODE_ENV === 'prod4gmo')
        return next(); // GMO結果通知に対してはオープンにする
    if (req.originalUrl === '/sendGrid/event/notify')
        return next(); // SendGridイベント通知に対してはオープンにする
    const user = basicAuth(req);
    if (user && user.name === BASIC_AUTH_NAME && user.pass === BASIC_AUTH_PASS)
        return next();
    res.statusCode = STATUS_CODE_UNAUTHORIZED;
    res.setHeader('WWW-Authenticate', 'Basic realm="TTTS Authentication"');
    res.end('Unauthorized');
};
