import log4js = require('log4js');

let env = process.env.NODE_ENV || 'dev';

// ディレクトリなければ作成(初回アクセス時だけ)
let fs = require('fs-extra');
let logDir = `${__dirname}/../../../logs/${env}/api`;
fs.mkdirsSync(logDir);

log4js.configure({
    appenders: [
        {
            category: 'access', // アクセスログ
            type: 'dateFile',
            filename: `${logDir}/access.log`,
            pattern: '-yyyy-MM-dd',
        },
        {
            category: 'system', // その他のアプリログ(DEBUG、INFO、ERRORなど)
            type: 'dateFile',
            filename: `${logDir}/system.log`,
            pattern: '-yyyy-MM-dd',
        },
        {
            type: 'console'
        }
    ],
    levels: {
        access: log4js.levels.ALL.toString(),
        system: (env === 'prod' || env === 'stg') ? log4js.levels.INFO.toString() : log4js.levels.ALL.toString()
    },
    replaceConsole: (env === 'prod' || env === 'stg') ? false : true
});

export default log4js.connectLogger(log4js.getLogger('access'), {});