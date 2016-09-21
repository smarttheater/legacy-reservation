"use strict";
const log4js = require('log4js');
let env = process.env.NODE_ENV || 'dev';
// ディレクトリなければ作成(初回アクセス時だけ)
let fs = require('fs-extra');
let logDir = `${__dirname}/../../../logs/${env}/frontend`;
fs.mkdirsSync(logDir);
log4js.configure({
    appenders: [
        {
            category: 'access',
            type: 'dateFile',
            filename: `${logDir}/access.log`,
            pattern: '-yyyy-MM-dd',
        },
        {
            category: 'system',
            type: 'dateFile',
            filename: `${logDir}/system.log`,
            pattern: '-yyyy-MM-dd',
        },
        {
            category: 'cancel',
            type: 'dateFile',
            filename: `${logDir}/cancel.log`,
            pattern: '-yyyy-MM-dd',
        },
        {
            type: 'console'
        }
    ],
    levels: {
        access: log4js.levels.ALL.toString(),
        system: (env === 'prod') ? log4js.levels.INFO.toString() : log4js.levels.ALL.toString(),
        cancel: (env === 'prod') ? log4js.levels.INFO.toString() : log4js.levels.ALL.toString()
    },
    replaceConsole: (env === 'prod') ? false : true
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = log4js.connectLogger(log4js.getLogger('access'), {});
