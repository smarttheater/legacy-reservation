/**
 * ベンチマークミドルウェア
 *
 * @module benchmarksMiddleware
 */
"use strict";
const log4js = require("log4js");
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable-next-line:variable-name
exports.default = (req, _res, next) => {
    if (process.env.NODE_ENV === 'development') {
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime();
        const logger = log4js.getLogger('system');
        req.on('end', () => {
            const endMemory = process.memoryUsage();
            const memoryUsage = endMemory.rss - startMemory.rss;
            const diff = process.hrtime(startTime);
            logger.debug(`process.pid: ${process.pid}. benchmark took ${diff[0]} seconds and ${diff[1]} nanoseconds. memoryUsage:${memoryUsage} (${startMemory.rss} - ${endMemory.rss})`);
        });
    }
    next();
};
