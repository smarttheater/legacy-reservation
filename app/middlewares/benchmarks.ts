/**
 * ベンチマークミドルウェア
 *
 * @module benchmarksMiddleware
 */

import { NextFunction, Request, Response } from 'express';
import * as log4js from 'log4js';

// tslint:disable-next-line:variable-name
export default (req: Request, _res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'dev') {
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime();
        const logger = log4js.getLogger('system');

        req.on('end', () => {
            const endMemory = process.memoryUsage();
            const memoryUsage = endMemory.rss - startMemory.rss;
            const diff = process.hrtime(startTime);
            logger.debug(
                `process.pid: ${process.pid}. benchmark took ${diff[0]} seconds and ${diff[1]} nanoseconds. memoryUsage:${memoryUsage} (${startMemory.rss} - ${endMemory.rss})`
            );
        });
    }

    next();
};
