"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const conf = require('config');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const fs = require('fs-extra');
let MONGOLAB_URI = conf.get('mongolab_uri');
class TestController extends BaseController_1.default {
    createIndexes() {
        let MongoClient = mongodb.MongoClient;
        MongoClient.connect(conf.get('mongolab_uri'), (err, db) => {
            let promises = [];
            promises.push(new Promise((resolve, reject) => {
                db.collection('reservations').createIndex({
                    performance: 1,
                    seat_code: 1
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('reservation_email_cues').createIndex({
                    payment_no: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('staffs').createIndex({
                    user_id: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('sponsors').createIndex({
                    user_id: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('window').createIndex({
                    user_id: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            promises.push(new Promise((resolve, reject) => {
                db.collection('tel_staffs').createIndex({
                    user_id: 1,
                }, {
                    unique: true
                }, (err) => {
                    this.logger.debug('index created.', err);
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            }));
            Promise.all(promises).then(() => {
                this.logger.debug('success!');
                db.close();
                process.exit(0);
            }, (err) => {
                db.close();
                process.exit(0);
            });
        });
    }
    createWindows() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/windows.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let windows = JSON.parse(data);
            // パスワードハッシュ化
            windows = windows.map((window) => {
                let password_salt = Util_1.default.createToken();
                window['password_salt'] = password_salt;
                window['password_hash'] = Util_1.default.createHash(window.password, password_salt);
                delete window['password'];
                return window;
            });
            this.logger.info('removing all windows...');
            Models_1.default.Window.remove({}, (err) => {
                this.logger.debug('creating windows...');
                Models_1.default.Window.create(windows, (err) => {
                    this.logger.info('windows created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    createTelStaffs() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/telStaffs.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let telStaffs = JSON.parse(data);
            // パスワードハッシュ化
            telStaffs = telStaffs.map((telStaff) => {
                let password_salt = Util_1.default.createToken();
                telStaff['password_salt'] = password_salt;
                telStaff['password_hash'] = Util_1.default.createHash(telStaff.password, password_salt);
                delete telStaff['password'];
                return telStaff;
            });
            this.logger.info('removing all telStaffs...');
            Models_1.default.TelStaff.remove({}, (err) => {
                this.logger.debug('creating telStaffs...');
                Models_1.default.TelStaff.create(telStaffs, (err) => {
                    this.logger.info('telStaffs created.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
