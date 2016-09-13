"use strict";
const BaseController_1 = require("../BaseController");
const conf = require("config");
const mongodb = require("mongodb");
let MONGOLAB_URI = conf.get('mongolab_uri');
class SchemaController extends BaseController_1.default {
    dropIndexes() {
        let MongoClient = mongodb.MongoClient;
        MongoClient.connect(conf.get('mongolab_uri'), (err, db) => {
            let collectionNames = [
                'authentications',
                'films',
                'members',
                'performances',
                'reservation_email_cues',
                'reservations',
                'screens',
                'sequences',
                'sponsors',
                'staffs',
                'tel_staffs',
                'theaters',
                'ticket_type_groups',
                'windows'
            ];
            let promises = collectionNames.map((collectionName) => {
                return new Promise((resolve, reject) => {
                    this.logger.debug('dropping index.', collectionName);
                    db.collection(collectionName).dropIndexes((err) => {
                        this.logger.debug('index droped.', collectionName, err);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
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
                db.collection('windows').createIndex({
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
