"use strict";
const BaseController_1 = require('../BaseController');
const conf = require('config');
const mongodb = require('mongodb');
let MONGOLAB_URI = conf.get('mongolab_uri');
class SchemaController extends BaseController_1.default {
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
            promises.push(new Promise((resolve, reject) => {
                db.collection('members').createIndex({
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
                db.collection('sequences').createIndex({
                    no: 1,
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
                db.collection('performances').createIndex({
                    day: 1,
                    start_time: 1
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
                this.logger.info('promised.');
                db.close();
                process.exit(0);
            }, (err) => {
                this.logger.error('promised.', err);
                db.close();
                process.exit(0);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SchemaController;
