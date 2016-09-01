import program = require('commander');
import fs = require('fs-extra');
import log4js = require('log4js');

import TestController from './controllers/Test/TestController';
import PreTiffController from './controllers/PreTiff/PreTiffController';
import StaffController from './controllers/Staff/StaffController';
import SponsorController from './controllers/Sponsor/SponsorController';
import PerformanceController from './controllers/Performance/PerformanceController';
import TheaterController from './controllers/Theater/TheaterController';
import FilmController from './controllers/Film/FilmController';
import MemberController from './controllers/Member/MemberController';
import ReservationController from './controllers/Reservation/ReservationController';
import SchemaController from './controllers/Schema/SchemaController';



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
    .action((method, options) => {
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

program
    .command('sponsor <method>')
    .description('外部関係者タスク')
    .action((method) => {
        let logDir = `${__dirname}/../../logs/${env}/task/Sponsor${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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

        (new SponsorController())[method]();
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

        (new PerformanceController())[method]();
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

        (new TheaterController())[method]();
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

        (new FilmController())[method]();
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

        (new MemberController())[method]();
    });

program
    .command('reservation <method>')
    .description('予約関連タスク')
    .action((method) => {
        let logDir = `${__dirname}/../../logs/${env}/task/Reservation${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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

        (new ReservationController())[method]();
    });

program
    .command('schema <method>')
    .description('スキーマ関連タスク')
    .action((method) => {
        let logDir = `${__dirname}/../../logs/${env}/task/Schema${method.charAt(0).toUpperCase()}${method.slice(1)}`;
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

        (new SchemaController())[method]();
    });

// program
//   .command('*')
//   .action(function(env){
//     console.log('deploying "%s"', env);
//   });

program.parse(process.argv);