/**
 * ペイデザインルーター
 *
 * @function payDesignRouter
 * @ignore
 */
import { NextFunction, Request, Response } from 'express';
import * as querystring from 'querystring';
import PayDesignReserveController from '../controllers/PayDesign/Reserve/PayDesignReserveController';

export default (app: any) => {
    app.post('/PayDesign/reserve/notify', '', (req: Request, res: Response, next: NextFunction) => {
        let content = new Buffer([]);
        req.on('data', (chunk: Buffer) => {
            content = Buffer.concat([content, chunk]);
        });

        req.on('end', () => {
            // tslint:disable-next-line:no-require-imports
            const jconv = require('jconv');
            // utf8変換
            const converted = jconv.convert(content, 'SJIS', 'UTF8');
            req.body = querystring.parse(converted.toString('utf8'));
            (new PayDesignReserveController(req, res, next)).notify();
        });
    });

    app.post('/PayDesign/reserve/cancel', '', (req: Request, res: Response, next: NextFunction) => {
        let content = new Buffer([]);
        req.on('data', (chunk: Buffer) => {
            content = Buffer.concat([content, chunk]);
        });

        req.on('end', () => {
            // tslint:disable-next-line:no-require-imports
            const jconv = require('jconv');
            // utf8変換
            const converted = jconv.convert(content, 'SJIS', 'UTF8');
            req.body = querystring.parse(converted.toString('utf8'));
            (new PayDesignReserveController(req, res, next)).cancel();
        });
    });
};
