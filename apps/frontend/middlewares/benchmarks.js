"use strict";
var log4js = require('log4js');
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = function (req, res, next) {
    var startMemory = process.memoryUsage();
    var startTime = process.hrtime();
    var logger = log4js.getLogger('system');
    req.on('end', function () {
        var endMemory = process.memoryUsage();
        var memoryUsage = endMemory.rss - startMemory.rss;
        var diff = process.hrtime(startTime);
        logger.debug("benchmark took " + diff[0] + " seconds and " + diff[1] + " nanoseconds. memoryUsage:" + memoryUsage + " (" + startMemory.rss + " - " + endMemory.rss + ")");
    });
    next();
};
