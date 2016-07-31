"use strict";
const program = require('commander');
const fs = require('fs-extra');
const log4js = require('log4js');
const TestController_1 = require('./controllers/Test/TestController');
let env = process.env.NODE_ENV || 'dev';
let logDefaultConfiguration = {
    appenders: [
        {
            type: 'console'
        }
    ],
    levels: {},
    replaceConsole: true
};
program
    .version('0.0.1');
program
    .command('test <method>')
    .description('テストタスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Test${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    fs.mkdirsSync(logDir);
    logDefaultConfiguration.appenders.push({
        category: 'system',
        type: 'dateFile',
        filename: `${logDir}/system.log`,
        pattern: '-yyyy-MM-dd',
        backups: 3
    });
    logDefaultConfiguration.levels.system = "ALL";
    log4js.configure(logDefaultConfiguration);
    (new TestController_1.default())[method]();
});
// program
//   .command('*')
//   .action(function(env){
//     console.log('deploying "%s"', env);
//   });
program.parse(process.argv);
