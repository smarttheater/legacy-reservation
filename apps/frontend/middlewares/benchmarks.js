"use strict";
const log4js = require('log4js');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req, res, next) => {
    let startMemory = process.memoryUsage();
    let startTime = process.hrtime();
    let logger = log4js.getLogger('system');
    req.on('end', () => {
        let endMemory = process.memoryUsage();
        let memoryUsage = endMemory.rss - startMemory.rss;
        let diff = process.hrtime(startTime);
        logger.debug(`benchmark took ${diff[0]} seconds and ${diff[1]} nanoseconds. memoryUsage:${memoryUsage} (${startMemory.rss} - ${endMemory.rss})`);
    });
    next();
};
