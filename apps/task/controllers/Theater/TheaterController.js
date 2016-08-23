"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const conf = require('config');
const mongoose = require('mongoose');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class TheaterController extends BaseController_1.default {
    createScreensFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/screens.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let screens = JSON.parse(data);
            this.logger.info('removing all screens...');
            Models_1.default.Screen.remove({}, (err) => {
                this.logger.info('creating screens...');
                Models_1.default.Screen.create(screens, (err) => {
                    this.logger.info('screens created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/theaters.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let theaters = JSON.parse(data);
            this.logger.info('removing all theaters...');
            Models_1.default.Theater.remove({}, (err) => {
                Models_1.default.Theater.create(theaters, (err) => {
                    this.logger.info('theaters created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TheaterController;
