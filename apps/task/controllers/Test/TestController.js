"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const conf = require('config');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const Util_1 = require('../../../common/Util/Util');
const fs = require('fs-extra');
const request = require('request');
const querystring = require('querystring');
const moment = require('moment');
let MONGOLAB_URI = conf.get('mongolab_uri');
class TestController extends BaseController_1.default {
    publishPaymentNo() {
        mongoose.connect(MONGOLAB_URI, {});
        ReservationUtil_1.default.publishPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }
    checkFullWidthLetter() {
        let filmName = '作家性の萌芽　1999-2003 （細田守監督短編集）『劇場版デジモンアドベンチャー』『劇場版デジモンアドベンチャー　ぼくらのウォーゲーム！』『村上隆作品　SUPERFLAT MONOGRAM』『村上隆作品　The Creatures From Planet 66 ～Roppongi Hills Story～』『おジャ魔女どれみドッカ～ン！（40話）』『明日のナージャ（OP、ED）』';
        let filmNameFullWidth = Util_1.default.toFullWidth(filmName);
        let registerDisp1 = '';
        for (let i = 0; i < filmNameFullWidth.length; i++) {
            let letter = filmNameFullWidth[i];
            if (letter.match(/[Ａ-Ｚａ-ｚ０-９]/)
                || letter.match(/[\u3040-\u309F]/) // ひらがな
                || letter.match(/[\u30A0-\u30FF]/) // カタカナ
                || letter.match(/[一-龠]/) // 漢字
            ) {
                registerDisp1 += letter;
            }
        }
        console.log(registerDisp1);
        process.exit(0);
    }
    listIndexes() {
        mongodb.MongoClient.connect(conf.get('mongolab_uri'), (err, db) => {
            let collectionNames = [
                'authentications',
                'customer_cancel_requests',
                'films',
                'members',
                'performances',
                'pre_customers',
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
                    db.collection(collectionName).indexInformation((err, info) => {
                        console.log(collectionName, 'indexInformation is', info);
                        resolve();
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
    testCreateConnection() {
        let uri = "mongodb://dev4gmotiffmlabmongodbuser:Yrpx-rPjr_Qjx79_R4HaknsfMEbyrQjp4NiF-XKj@ds048719.mlab.com:48719/dev4gmotiffmlabmongodb";
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Reservation.count({}, (err, count) => {
            this.logger.info('count', err, count);
            let db4gmo = mongoose.createConnection(uri);
            db4gmo.collection('reservations').count({}, (err, count) => {
                this.logger.info('count', err, count);
                db4gmo.close();
                Models_1.default.Reservation.count({}, (err, count) => {
                    this.logger.info('count', err, count);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    /**
     * メール配信された購入番号リストを取得する
     */
    getPaymentNosWithEmail() {
        mongoose.connect(MONGOLAB_URI);
        Models_1.default.GMONotification.distinct('order_id', {
            // status:{$in:["CAPTURE","PAYSUCCESS"]},
            status: { $in: ["PAYSUCCESS"] },
            processed: true
        }, (err, orderIds) => {
            console.log('orderIds length is ', orderIds.length);
            let file = `${__dirname}/../../../../logs/${process.env.NODE_ENV}/orderIds.txt`;
            console.log(file);
            fs.writeFileSync(file, orderIds.join("\n"), 'utf8');
            mongoose.disconnect();
            process.exit(0);
        });
        // fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/orderIds.json`, 'utf8', (err, data) => {
        //     console.log(err);
        //     let orderIds: Array<string> = JSON.parse(data);
        //     console.log('orderIds length is ', orderIds.length);
        //     mongoose.connect(MONGOLAB_URI);
        //     this.logger.info('finding...');
        //     Models.ReservationEmailCue.distinct('payment_no', {
        //         is_sent: true,
        //         payment_no: {$in: orderIds}
        //     }, (err, paymentNos) => {
        //         console.log('paymentNos length is ', paymentNos.length);
        //         let file = `${__dirname}/../../../../logs/${process.env.NODE_ENV}/paymentNos.txt`;
        //         console.log(file);
        //         fs.writeFileSync(file, paymentNos.join("\n"), 'utf8');
        //         mongoose.disconnect();
        //         process.exit(0);
        //     });
        // });
    }
    createEmailCues() {
        fs.readFile(`${__dirname}/../../../../logs/${process.env.NODE_ENV}/20161021_orderIds4reemail.json`, 'utf8', (err, data) => {
            let orderIds = JSON.parse(data);
            console.log('orderIds length is ', orderIds.length);
            let cues = orderIds.map((orderId) => {
                return {
                    payment_no: orderId,
                    is_sent: false
                };
            });
            mongoose.connect(MONGOLAB_URI);
            this.logger.info('creating ReservationEmailCues...length:', cues.length);
            Models_1.default.ReservationEmailCue.insertMany(cues, (err, docs) => {
                this.logger.info('ReservationEmailCues created.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
    /**
     * 座席解放
     */
    release() {
        mongoose.connect(MONGOLAB_URI);
        Models_1.default.Reservation.count({
            status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
        }, (err, count) => {
            console.log(count);
            // Models.Reservation.remove({
            //     status: ReservationUtil.STATUS_KEPT_BY_TIFF
            // }, (err) => {
            //     console.log(err);
            mongoose.disconnect();
            process.exit(0);
            // });
        });
    }
    gmoNotificationProcessing2unprocess() {
        mongoose.connect(MONGOLAB_URI);
        this.logger.info('updating GMONotification...');
        Models_1.default.GMONotification.update({
            process_status: "PROCESSING",
            updated_at: {
                $lt: moment().add(-1, 'hour').toISOString()
            },
        }, {
            process_status: "UNPROCESSED"
        }, {
            multi: true
        }, (err, raw) => {
            this.logger.info('GMONotification updated.', err, raw);
            mongoose.disconnect();
            process.exit(0);
        });
    }
    getBounces() {
        let query = querystring.stringify({
            api_user: conf.get('sendgrid_username'),
            api_key: conf.get('sendgrid_password'),
            date: "1",
        });
        request.get({
            url: `https://api.sendgrid.com/api/bounces.get.json?${query}`
        }, (error, response, body) => {
            this.logger.info('request processed.', error, body);
            process.exit(0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
