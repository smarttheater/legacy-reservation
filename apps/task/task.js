"use strict";
const program = require('commander');
const fs = require('fs-extra');
const log4js = require('log4js');
const TestController_1 = require('./controllers/Test/TestController');
const PreTiffController_1 = require('./controllers/PreTiff/PreTiffController');
const StaffController_1 = require('./controllers/Staff/StaffController');
const PerformanceController_1 = require('./controllers/Performance/PerformanceController');
const TheaterController_1 = require('./controllers/Theater/TheaterController');
const FilmController_1 = require('./controllers/Film/FilmController');
const MemberController_1 = require('./controllers/Member/MemberController');
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
    (new PreTiffController_1.default())[method]();
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
    (new StaffController_1.default())[method]();
});
program
    .command('performance <method>')
    .description('パフォーマンスタスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Performance${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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
    (new PerformanceController_1.default())[method]();
});
program
    .command('theater <method>')
    .description('劇場タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Theater${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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
    (new TheaterController_1.default())[method]();
});
program
    .command('film <method>')
    .description('作品タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Film${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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
    (new FilmController_1.default())[method]();
});
program
    .command('member <method>')
    .description('メルマガ会員タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Member${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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
    (new MemberController_1.default())[method]();
});
// program
//   .command('*')
//   .action(function(env){
//     console.log('deploying "%s"', env);
//   });
program.parse(process.argv);
