import program = require('commander');
import fs = require('fs-extra');
import log4js = require('log4js');

import TestController from './controllers/Test/TestController';
import PreTiffController from './controllers/PreTiff/PreTiffController';
import StaffController from './controllers/Staff/StaffController';



let env = process.env.NODE_ENV || 'dev';
let logDefaultConfiguration: any = {
    appenders: [
        {
            type: 'console'
        }
    ],
    levels: {
    },
    replaceConsole: true
};




program
    .version('0.0.1')

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

        (new TestController())[method]();
    });

program
    .command('pretiff <method>')
    .description('0905試写会タスク')
    .action((method) => {
        let logDir = `${__dirname}/../../logs/${env}/task/PreTiff${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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

        (new PreTiffController())[method]();
    });

program
    .command('staff <method>')
    .description('内部関係者タスク')
    .action((method) => {
        let logDir = `${__dirname}/../../logs/${env}/task/Staff${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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

        (new StaffController())[method]();
    });

// program
//   .command('*')
//   .action(function(env){
//     console.log('deploying "%s"', env);
//   });

program.parse(process.argv);