import * as basicAuth from 'basic-auth';
import * as express from 'express';

const STATUS_CODE_UNAUTHORIZED = 401;

export default (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (process.env.NODE_ENV === 'dev') return next();
    if (process.env.NODE_ENV === 'prod') return next();
    if (process.env.NODE_ENV === 'test') return next();
    if (process.env.NODE_ENV === 'dev4gmo') return next(); // GMO結果通知に対してはオープンにする
    if (process.env.NODE_ENV === 'test4gmo') return next(); // GMO結果通知に対してはオープンにする
    if (process.env.NODE_ENV === 'prod4gmo') return next(); // GMO結果通知に対してはオープンにする

    if (req.originalUrl === '/sendGrid/event/notify') return next(); // SendGridイベント通知に対してはオープンにする

    const user = basicAuth(req);

    if (user && user.name === 'motionpicture' && user.pass === '4_CS/T|YG*Lz') return next();

    res.statusCode = STATUS_CODE_UNAUTHORIZED;
    res.setHeader('WWW-Authenticate', 'Basic realm="TTTS Authentication"');
    res.end('Unauthorized');
};
