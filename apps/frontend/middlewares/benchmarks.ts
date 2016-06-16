import express = require('express');
import path = require('path');
import fs = require('fs');
import log4js = require('log4js');

export default (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let startMemory = process.memoryUsage();
    let startTime = process.hrtime();
    let logger = log4js.getLogger('system');

    req.on('end', () => {
        let endMemory = process.memoryUsage();
        let memoryUsage = endMemory.rss - startMemory.rss;
        let diff = process.hrtime(startTime);
        logger.debug(
            `benchmark took ${diff[0]} seconds and ${diff[1]} nanoseconds. memoryUsage:${memoryUsage} (${startMemory.rss} - ${endMemory.rss})`
        );
    });

    next();
};