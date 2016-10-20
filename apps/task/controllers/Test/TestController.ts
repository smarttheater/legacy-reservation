import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import mongodb = require('mongodb');
import mongoose = require('mongoose');
import conf = require('config');
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import GMOUtil from '../../../common/Util/GMO/GMOUtil';
import Util from '../../../common/Util/Util';
import fs = require('fs-extra');
import request = require('request');
import querystring = require('querystring');
import moment = require('moment');
import sendgrid = require('sendgrid');
import emailTemplates = require('email-templates');
import qr = require('qr-image');
import numeral = require('numeral');
import GMONotificationModel from '../../../frontend/models/Reserve/GMONotificationModel';
import GMONotificationResponseModel from '../../../frontend/models/Reserve/GMONotificationResponseModel';

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class TestController extends BaseController {
    public checkIfExist(): void {
        mongoose.connect(MONGOLAB_URI, {});

        // MP確保スタッフを取得
        Models.Staff.findOne({
            user_id: "motionpicture_keep"
        }, (err, staff) => {
            let allReservations = [];

            // 抽出予約データファイルリスト
            fs.readdir(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCVS`, (err, files) => {
                let promises = files.map((file) => {
                    return new Promise((resolve, reject) => {
                        // json読み込み
                        this.logger.debug('reading file...', file);
                        fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCVS/${file}`, 'utf8', (err, data) => {
                            this.logger.debug('file read.', file);
                            let reservations: Array<any> = JSON.parse(data);
                            for (let resevation of reservations) {
                                allReservations.push(resevation);
                            }

                            resolve();
                        });
                    });
                });



                Promise.all(promises).then(() => {
                    console.log(allReservations.length);
                    let promises = allReservations.map((reservation) => {
                        return new Promise((resolve, reject) => {
                            this.logger.debug('finding reservation', reservation.performance, reservation.seat_code);
                            Models.Reservation.findOne({
                                performance: reservation.performance,
                                seat_code: reservation.seat_code,
                            }, (err, reservationDocument) => {
                                this.logger.debug('reservation found.', err, (reservationDocument) ? reservationDocument.get('status') : null);
                                if (err) return reject(err);
                                if (reservationDocument) {
                                    this.logger.debug('payment_no ok?', (reservationDocument.get('payment_no') === reservation.payment_no));
                                    return resolve();
                                }

                                let newReservation = {
                                    "performance": reservation.performance,
                                    "seat_code": reservation.seat_code,
                                    "status": ReservationUtil.STATUS_RESERVED,
                                    "staff": staff.get('_id'),
                                    "staff_user_id": staff.get('user_id'),
                                    "staff_email": staff.get('email'),
                                    "staff_name": staff.get('name'),
                                    "staff_signature": "system",
                                    "entered": false,
                                    "updated_user": "system",
                                    "purchased_at": Date.now(),
                                    "watcher_name_updated_at": null,
                                    "watcher_name": "",
                                    "film_copyright": reservation.film_copyright,
                                    "film_is_mx4d": reservation.film_is_mx4d,
                                    "film_image": reservation.film_image,
                                    "film_name_en": reservation.film_name_en,
                                    "film_name_ja": reservation.film_name_ja,
                                    "film": reservation.film,
                                    "screen_name_en": reservation.screen_name_en,
                                    "screen_name_ja": reservation.screen_name_ja,
                                    "screen": reservation.screen,
                                    "theater_name_en": reservation.theater_name_en,
                                    "theater_name_ja": reservation.theater_name_ja,
                                    "theater_address_en": reservation.theater_address_en,
                                    "theater_address_ja": reservation.theater_address_ja,
                                    "theater": reservation.theater,
                                    "performance_canceled": reservation.performance_canceled,
                                    "performance_end_time": reservation.performance_end_time,
                                    "performance_start_time": reservation.performance_start_time,
                                    "performance_open_time": reservation.performance_open_time,
                                    "performance_day": reservation.performance_day,
                                    "purchaser_group": ReservationUtil.PURCHASER_GROUP_STAFF,
                                    "payment_no": reservation.payment_no,
                                    "payment_seat_index": reservation.payment_seat_index,
                                    "charge": 0,
                                    "ticket_type_charge": 0,
                                    "ticket_type_name_en": "Free",
                                    "ticket_type_name_ja": "無料",
                                    "ticket_type_code": "00",
                                    "seat_grade_additional_charge": 0,
                                    "seat_grade_name_en": "Normal Seat",
                                    "seat_grade_name_ja": "ノーマルシート"
                                };

                                resolve();
                            });
                        });
                    });

                    Promise.all(promises).then(() => {
                        this.logger.info('promised.');
                        mongoose.disconnect();
                        process.exit(0);
                    }).catch((err) => {
                        this.logger.error('promised.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    });

                }).catch((err) => {
                    this.logger.error('promised.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }

    public createReservationsFromLogs(): void {
        // fs.readFile(`${process.cwd()}/logs/gmoOrderIdsCredit.json`, 'utf8', (err, data) => {
        fs.readFile(`${process.cwd()}/logs/gmoOrderIdsCVS.json`, 'utf8', (err, data) => {
            let paymentNos: Array<string> = JSON.parse(data);
            console.log(paymentNos.length);


            let promises = paymentNos.map((paymentNo) => {
                return new Promise((resolve, reject) => {
                    fs.readFile(`${process.cwd()}/logs/reservationsGmoError/${paymentNo[paymentNo.length - 1]}/${paymentNo}.log`, 'utf8', (err, data) => {
                        this.logger.info('log found', err);
                        if (err) return resolve();

                        // let pattern = /\[(.+)] \[INFO] reservation - updating reservation all infos...update: { _id: '(.+)',\n  status: '(.+)',\n  seat_code: '(.+)',\n  seat_grade_name_ja: '(.+)',\n  seat_grade_name_en: '(.+)',\n  seat_grade_additional_charge: (.+),\n  ticket_type_code: '(.+)',\n  ticket_type_name_ja: '(.+)',\n  ticket_type_name_en: '(.+)',\n  ticket_type_charge: (.+),\n  charge: (.+),\n  payment_no: '(.+)',\n  purchaser_group: '(.+)',\n  performance: '(.+)',\n/;
                        let pattern = /reservation - updating reservation all infos...update: {[^}]+}/g;
                        let matches = data.match(pattern);
                        let json = '[\n';

                        if (matches) {
                            matches.forEach((match, index) => {
                                json += (index > 0) ? ',\n' : '';
                                let reservation = match.replace('reservation - updating reservation all infos...update: ', '')
                                    .replace(/"/g, '\\"')
                                    .replace(/ _id:/g, '"_id":')
                                    .replace(/  ([a-z_]+[a-z0-9_]+):/g, '"$1":')
                                    .replace(/: '/g, ': "')
                                    .replace(/',/g, '",')
                                    .replace(/\\'/g, '\'');
                                json += reservation;
                            })
                        }

                        json += '\n]';

                        this.logger.info('writing json...');
                        // fs.writeFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCredit/${paymentNo}.json`, json, 'utf8', (err) => {
                        fs.writeFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCVS/${paymentNo}.json`, json, 'utf8', (err) => {
                            this.logger.info('json written', err);
                            (err) ? reject(err) : resolve();
                        });
                    });
                });
            });

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                process.exit(0);
            }).catch((err) => {
                this.logger.error('promised.', err);
                process.exit(0);
            });
        });

    }

    public publishPaymentNo(): void {
        mongoose.connect(MONGOLAB_URI, {});
        ReservationUtil.publishPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }

    /**
     * オーダーIDからGMO取消を行う
     */
    public cancelGMO(): void {
        let options: any;
        let paymentNo = '50000001412';

        // 取引状態参照
        options = {
            url: 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
            form: {
                ShopID: conf.get<string>('gmo_payment_shop_id'),
                ShopPass: conf.get<string>('gmo_payment_shop_password'),
                OrderID: paymentNo
            }
        };
        this.logger.info('requesting... options:', options);
        request.post(options, (error, response, body) => {
            this.logger.info('request processed.', error, body);
            if (error) return process.exit(0);
            if (response.statusCode !== 200) return process.exit(0);
            let searchTradeResult = querystring.parse(body);
            if (searchTradeResult['ErrCode']) return process.exit(0);
            if (searchTradeResult.Status !== GMOUtil.STATUS_CREDIT_CAPTURE) return process.exit(0); // 即時売上状態のみ先へ進める

            this.logger.info('searchTradeResult is ', searchTradeResult);

            // 決済変更
            options = {
                url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
                form: {
                    ShopID: conf.get<string>('gmo_payment_shop_id'),
                    ShopPass: conf.get<string>('gmo_payment_shop_password'),
                    AccessID: searchTradeResult.AccessID,
                    AccessPass: searchTradeResult.AccessPass,
                    JobCd: GMOUtil.STATUS_CREDIT_VOID
                }
            };
            this.logger.info('requesting... options:', options);
            request.post(options, (error, response, body) => {
                this.logger.info('request processed.', error, body);
                if (error) return process.exit(0);
                if (response.statusCode !== 200) return process.exit(0);
                let alterTranResult = querystring.parse(body);
                if (alterTranResult['ErrCode']) return process.exit(0);

                this.logger.info('alterTranResult is ', alterTranResult);

                process.exit(0);
            });
        }); 
    }

    public checkFullWidthLetter() {
        let filmName = '作家性の萌芽　1999-2003 （細田守監督短編集）『劇場版デジモンアドベンチャー』『劇場版デジモンアドベンチャー　ぼくらのウォーゲーム！』『村上隆作品　SUPERFLAT MONOGRAM』『村上隆作品　The Creatures From Planet 66 ～Roppongi Hills Story～』『おジャ魔女どれみドッカ～ン！（40話）』『明日のナージャ（OP、ED）』';
        let filmNameFullWidth = Util.toFullWidth(filmName);
        let registerDisp1 = '';
        for (let i = 0; i < filmNameFullWidth.length; i++) {
            let letter = filmNameFullWidth[i];
            if (
                letter.match(/[Ａ-Ｚａ-ｚ０-９]/)
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

    public countReservations(): void {
        mongoose.connect(MONGOLAB_URI, {});
        Models.Reservation.find({
            purchaser_group: {$in: [ReservationUtil.PURCHASER_GROUP_CUSTOMER, ReservationUtil.PURCHASER_GROUP_MEMBER]},
            // payment_no: "77000110810"
            status: ReservationUtil.STATUS_RESERVED,
            // status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
            purchased_at: {$gt: moment('2016-10-20T12:00:00+9:00')}
        }, 'payment_no', (err, reservations) => {
            this.logger.info('reservations length is', reservations.length);
            let paymentNos = [];
            reservations.forEach((reservation) => {
                if (paymentNos.indexOf(reservation.get('payment_no')) < 0) {
                    paymentNos.push(reservation.get('payment_no'));
                }
            });
            this.logger.info('paymentNos.length is', paymentNos.length);
            mongoose.disconnect();
            process.exit(0);
        });
    }

    public countReservationCues(): void {
        mongoose.connect(MONGOLAB_URI, {});
        Models.ReservationEmailCue.count({
            is_sent: false,
        }, (err, count) => {
            this.logger.info('count is', count);
            mongoose.disconnect();
            process.exit(0);
        });
    }

    public listIndexes(): void {
        mongodb.MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
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

    // public checkReservationUnique(): void {
    //     mongoose.connect(MONGOLAB_URI, {});
    //     Models.Reservation.findOne({
    //         performance: "000006",
    //         seat_code: "A-6",
    //         status: "RESERVED"
    //     }, (err, reservation) => {
    //         this.logger.info('reservations created.', err, reservation);
    //         mongoose.disconnect();
    //         process.exit(0);
    //     });
    // }

    public testCreateConnection(): void {
        let uri = "mongodb://dev4gmotiffmlabmongodbuser:Yrpx-rPjr_Qjx79_R4HaknsfMEbyrQjp4NiF-XKj@ds048719.mlab.com:48719/dev4gmotiffmlabmongodb";
        mongoose.connect(MONGOLAB_URI, {});
        Models.Reservation.count({
        }, (err, count) => {
            this.logger.info('count', err, count);

            let db4gmo = mongoose.createConnection(uri);
            db4gmo.collection('reservations').count({
            }, (err, count) => {
                this.logger.info('count', err, count);
                db4gmo.close();

                Models.Reservation.count({
                }, (err, count) => {
                    this.logger.info('count', err, count);

                    mongoose.disconnect();
                    process.exit(0);
                });
            })
        });
    }

    /**
     * GMOの結果通知を受け取る
     */
    public receiveGMONotify(): void {
        // let body = {
        //     ShopID: 'tshop00024743',
        //     ShopPass: '**********',
        //     AccessID: '75340a34dde2a2f3d77c70a48cd815e3',
        //     AccessPass: '********************************',
        //     OrderID: '40019101113',
        //     Status: 'CAPTURE',
        //     JobCd: 'CAPTURE',
        //     Amount: '1800',
        //     Tax: '0',
        //     Currency: 'JPN',
        //     Forward: '2a99662',
        //     Method: '1',
        //     PayTimes: '',
        //     TranID: '1610181733111111111111871056',
        //     Approve: '8707831',
        //     TranDate: '20161018173356',
        //     ErrCode: '',
        //     ErrInfo: '',
        //     PayType: '0',
        //     CvsCode: '',
        //     CvsConfNo: '',
        //     CvsReceiptNo: ''
        // }

        let body = {
            ShopID: 'tshop00024743',
            ShopPass: '**********',
            AccessID: '422a20615f52ae87a7572561d22a4f92',
            AccessPass: '********************************',
            OrderID: '40016201113',
            Status: 'REQSUCCESS',
            JobCd: '',
            Amount: '1450',
            Tax: '0',
            Currency: 'JPN',
            Forward: '',
            Method: '',
            PayTimes: '',
            TranID: '16101900000002212555',
            Approve: '',
            TranDate: '20161019010112',
            ErrCode: '',
            ErrInfo: '',
            PayType: '3',
            CvsCode: '10002',
            CvsConfNo: '12345',
            CvsReceiptNo: 'FM6806472980',
        }

        let gmoNotificationModel = GMONotificationModel.parse(body);
        this.logger.info('gmoNotificationModel is', gmoNotificationModel);

        // 何を最低限保管する？
        // mongoose.createConnection("mongodb://devtiffmlabmongodbuser:Yrpx-rPjr_Qjx79_R4HaknsfMEbyrQjp4NiF-XKj@ds044229.mlab.com:44229/devtiffmlabmongodb");
        mongoose.connect(MONGOLAB_URI, {});
        Models.GMONotification.create({
            shop_id: gmoNotificationModel.ShopID,
            order_id: gmoNotificationModel.OrderID,
            status: gmoNotificationModel.Status,
            job_cd: gmoNotificationModel.JobCd,
            amount: gmoNotificationModel.Amount,
            pay_type: gmoNotificationModel.PayType,
            processed: false
        }, (err, count) => {
            this.logger.info('count is', count);
            mongoose.disconnect();
            process.exit(0);
        });
    }

    /**
     * GMO結果通知を処理する
     */
    public processGMONotification(): void {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('finding notification...');
        Models.GMONotification.findOne({
            processed: false
        }, (err, notification) => {
            this.logger.info('notification found.', err, notification);
            if (err) {
                mongoose.disconnect();
                return process.exit(0);
            }
            if (!notification) {
                mongoose.disconnect();
                return process.exit(0);
            }




            // 内容の整合性チェック
            this.logger.info('finding reservations...payment_no:', notification.get('order_id'));
            Models.Reservation.find({
                payment_no: notification.get('order_id')
            }, (err, reservations) => {
                this.logger.info('reservations found.', err, reservations.length);
                if (err) {
                    mongoose.disconnect();
                    return process.exit(0);
                }
                if (reservations.length === 0) {
                    mongoose.disconnect();
                    return process.exit(0);
                }

                // チェック文字列
                let shopPassString = GMOUtil.createShopPassString(
                    notification.get('shop_id'),
                    notification.get('order_id'),
                    notification.get('amount'),
                    conf.get<string>('gmo_payment_shop_password'),
                    moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss')
                );
                this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                    mongoose.disconnect();
                    return process.exit(0);
                }




                // クレジットカード決済の場合
                if (notification.get('pay_type') === GMOUtil.PAY_TYPE_CREDIT) {
                    switch (notification.get('status')) {
                        case GMOUtil.STATUS_CREDIT_CAPTURE:
                            // 予約完了ステータスへ変更
                            this.logger.info('updating reservations by paymentNo...', notification.get('order_id'));
                            Models.Reservation.update(
                                {payment_no: notification.get('order_id')},
                                {
                                    status: ReservationUtil.STATUS_RESERVED,
                                    updated_user: 'system'
                                },
                                {multi: true},
                                (err, raw) => {
                                    this.logger.info('reservations updated.', err, raw);
                                    if (err) {
                                        mongoose.disconnect();
                                        return process.exit(0);
                                    }

                                    this.logger.info('sending an email...');
                                    this.sendEmail(reservations, (err) => {
                                        this.logger.info('an email sent.', err);
                                        if (err) {
                                            mongoose.disconnect();
                                            return process.exit(0);
                                        } else {
                                            // processedフラグをたてる
                                            notification.set('processed', true);
                                            this.logger.info('saving notificaton...');
                                            notification.save((err) => {
                                                this.logger.info('notification saved.', err);
                                                mongoose.disconnect();
                                                return process.exit(0);
                                            });
                                        }
                                    });
                                }
                            );

                            break;

                        case GMOUtil.STATUS_CREDIT_UNPROCESSED:
                            // 未決済の場合、放置
                            // ユーザーが「戻る」フローでキャンセルされる、あるいは、時間経過で空席になる
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        case GMOUtil.STATUS_CREDIT_AUTHENTICATED:
                        case GMOUtil.STATUS_CREDIT_CHECK:
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        case GMOUtil.STATUS_CREDIT_AUTH:
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        case GMOUtil.STATUS_CREDIT_SALES:
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        case GMOUtil.STATUS_CREDIT_VOID: // 取消し
                            // 空席に戻さない(つくったけれども、連動しない方向で仕様決定)
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        case GMOUtil.STATUS_CREDIT_RETURN:
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        case GMOUtil.STATUS_CREDIT_RETURNX:
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        case GMOUtil.STATUS_CREDIT_SAUTH:
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        default:
                            mongoose.disconnect();
                            process.exit(0);
                            break;
                    }
                } else if (notification.get('pay_type') === GMOUtil.PAY_TYPE_CVS) {


                    switch (notification.get('status')) {
                        case GMOUtil.STATUS_CVS_PAYSUCCESS:
                            // 予約完了ステータスへ変更
                            this.logger.info('updating reservations by paymentNo...', notification.get('order_id'));
                            Models.Reservation.update(
                                {payment_no: notification.get('order_id')},
                                {
                                    status: ReservationUtil.STATUS_RESERVED,
                                    updated_user: 'system'
                                },
                                {multi: true},
                                (err, raw) => {
                                    this.logger.info('reservations updated.', err, raw);
                                    if (err) {
                                        mongoose.disconnect();
                                        return process.exit(0);
                                    }

                                    this.logger.info('sending an email...');
                                    this.sendEmail(reservations, (err) => {
                                        this.logger.info('an email sent.', err);
                                        if (err) {
                                            mongoose.disconnect();
                                            return process.exit(0);
                                        } else {
                                            // processedフラグをたてる
                                            notification.set('processed', true);
                                            this.logger.info('saving notificaton...');
                                            notification.save((err) => {
                                                this.logger.info('notification saved.', err);
                                                mongoose.disconnect();
                                                return process.exit(0);
                                            });
                                        }
                                    });
                                }
                            );

                            break;

                        case GMOUtil.STATUS_CVS_REQSUCCESS:
                            // メールだけ送信
                            this.logger.info('sending an email...');
                            this.sendEmail(reservations, (err) => {
                                this.logger.info('an email sent.', err);
                                if (err) {
                                    mongoose.disconnect();
                                    return process.exit(0);
                                } else {
                                    // processedフラグをたてる
                                    notification.set('processed', true);
                                    this.logger.info('saving notificaton...');
                                    notification.save((err) => {
                                        this.logger.info('notification saved.', err);
                                        mongoose.disconnect();
                                        return process.exit(0);
                                    });
                                }
                            });

                            break;

                        case GMOUtil.STATUS_CVS_UNPROCESSED:
                            mongoose.disconnect();
                            process.exit(0);
                            break;

                        case GMOUtil.STATUS_CVS_PAYFAIL: // 決済失敗
                        case GMOUtil.STATUS_CVS_EXPIRED: // 期限切れ
                        case GMOUtil.STATUS_CVS_CANCEL: // 支払い停止
                            // 空席に戻す
                            this.logger.info('removing reservations...payment_no:', notification.get('order_id'));
                            let promises = reservations.map((reservation) => {
                                return new Promise((resolve, reject) => {
                                    this.logger.info('removing reservation...', reservation.get('_id'));
                                    reservation.remove((err) => {
                                        this.logger.info('reservation removed.', reservation.get('_id'), err);
                                        (err) ? reject(err) : resolve();
                                    });
                                });
                            });
                            Promise.all(promises).then(() => {
                                // processedフラグをたてる
                                notification.set('processed', true);
                                this.logger.info('saving notificaton...');
                                notification.save((err) => {
                                    this.logger.info('notification saved.', err);
                                    mongoose.disconnect();
                                    return process.exit(0);
                                });
                            }, (err) => {
                                mongoose.disconnect();
                                return process.exit(0);
                            });

                            break;

                        default:
                            mongoose.disconnect();
                            process.exit(0);
                            break;
                    }

                } else {
                    // 他の決済は本案件では非対応
                    mongoose.disconnect();
                    process.exit(0);
                }

            });
        });
    }

    /**
     * メール送信
     */
    private sendEmail(reservations: Array<mongoose.Document>, cb: (err: Error) => void): void {
        let to = '';
        let purchaserGroup = reservations[0].get('purchaser_group');
        switch (purchaserGroup) {
            case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
            case ReservationUtil.PURCHASER_GROUP_MEMBER:
            case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                to = reservations[0].get('purchaser_email')
                break;

            case ReservationUtil.PURCHASER_GROUP_STAFF:
                to = reservations[0].get('staff_email')
                break;

            default:
                break;
        }

        this.logger.info('to is', to);

        if (!to) return cb(null); // toがなければ終了




        let EmailTemplate = emailTemplates.EmailTemplate
        // __dirnameを使うとテンプレートを取得できないので注意
        // http://stackoverflow.com/questions/38173996/azure-and-node-js-dirname
        let dir: string;
        let title_ja: string;
        let title_en: string;
        switch (reservations[0].get('status')) {
            case ReservationUtil.STATUS_RESERVED:
                // 1.5次販売はメールテンプレート別
                if (reservations[0].get('pre_customer')) {
                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete4preCustomer`;
                    title_ja = '東京国際映画祭チケット 購入完了のお知らせ';
                    title_en = 'Notice of Completion of TIFF Ticket Purchase';
                } else {
                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete`;
                    title_ja = '東京国際映画祭チケット 購入完了のお知らせ';
                    title_en = 'Notice of Completion of TIFF Ticket Purchase';
                }

                break;
            case ReservationUtil.STATUS_WAITING_SETTLEMENT:
                // 1.5次販売はメールテンプレート別
                if (reservations[0].get('pre_customer')) {
                    dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement4preCustomer`;
                    title_ja = '東京国際映画祭チケット 仮予約完了のお知らせ';
                    title_en = 'Notice of Completion of Tentative Reservation for TIFF Tickets';
                } else {
                    dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement`;
                    title_ja = '東京国際映画祭チケット 仮予約完了のお知らせ';
                    title_en = 'Notice of Completion of Tentative Reservation for TIFF Tickets';
                }

                break;
            default:
                break;
        }

        if (!dir) return cb(null);

        let template = new EmailTemplate(dir);
        let locals = {
            title_ja: title_ja,
            title_en: title_en,
            reservations: reservations,
            moment: moment,
            numeral: numeral,
            conf: conf,
            GMOUtil: GMOUtil,
            ReservationUtil: ReservationUtil
        };
        this.logger.info('rendering template...dir:', dir);
        template.render(locals, (err, result) => {
            this.logger.info('email template rendered.', err);
            if (err) return cb(new Error('failed inf rendering an email.'));

            let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));
            let email = new _sendgrid.Email({
                to: to,
                fromname: conf.get<string>('email.fromname'),
                from: conf.get<string>('email.from'),
                subject: `${(process.env.NODE_ENV !== 'prod') ? `[${process.env.NODE_ENV}]` : ''}${title_ja} ${title_en}`,
                html: result.html
            });

            // 完了の場合、QRコードを添付
            if (reservations[0].get('status') === ReservationUtil.STATUS_RESERVED) {
                // add barcodes
                for (let reservation of reservations) {
                    let reservationId = reservation.get('_id').toString();
                    let png = qr.imageSync(reservation.get('qr_str'), {type: 'png'});

                    email.addFile({
                        filename: `QR_${reservationId}.png`,
                        contentType: 'image/png',
                        cid: `qrcode_${reservationId}`,
                        content: png
                    });
                }
            }

            // add logo
            email.addFile({
                filename: `logo.png`,
                contentType: 'image/png',
                cid: 'logo',
                content: fs.readFileSync(`${__dirname}/../../../../public/images/email/logo.png`)
            });

            this.logger.info('sending an email...email:', email);
            _sendgrid.send(email, (err, json) => {
                this.logger.info('an email sent.', err, json);
                if (err) return cb(err);

                // 送信済みフラグを立てる
                this.logger.info('setting is_sent to true...');
                return cb(null);
            });
        });
    }

    public sendTestEmail(): void {
        let html = `<!DOCTYPE html>\r\n<html lang="ja">\r\n<head>\r\n<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\r\n<title>東京国際映画祭チケット 購入完了のお知らせ Notice of Completion of TIFF Ticket Purchase</title>\r\n<!--\r\n    gmailはstyle要素とlink要素を無効にするので全タグにstyle属性を付けるしかない\r\n    https://www.campaignmonitor.com/css/\r\n-->\r\n</head>\r\n<body>\r\n\r\n<div style="background-color:#fff;height:80px;text-align:center;">\r\n    <img src="cid:logo" alt="東京国際映画祭" >\r\n</div>\r\n\r\n\r\n<div style="padding:0 30px;font-family:\'游ゴシック\',meiryo,sans-serif;">\r\n    <h1 style="margin:0;font-size:20px;text-align:center;">東京国際映画祭チケット 購入完了のお知らせ</h1>\r\n    <h2 style="margin:0;font-size:16px;text-align:center;">Notice of Completion of TIFF Ticket Purchase</h2>\r\n\r\n    <p style="font-weight:bold;">ヨシダ サチエ 様</p>\r\n    <p style="font-weight:bold;font-size:12px;">Dear サチエ ヨシダ,</p>\r\n\r\n    <p style="font-size:14px;">\r\n        この度はご購入いただき誠にありがとうございます。<br>\r\n        ご入場の際に本メールのQRコードが必要となりますので、ご鑑賞当日は必ずお持ちください。<br>\r\n        QRコードは画像保存もしくは印刷していただくと便利です。<br>\r\n        尚、お取り扱いには十分ご注意ください。<br>\r\n        \r\n        ＊本メールはご鑑賞後まで、大切に保管してください。\r\n    </p>\r\n    <p style="font-size:12px;">\r\n        Thank you very much for your purchase.<br>\r\n        Please be sure to bring the QR code attached to the email with you when attending your screening as it is required for admission. <br>\r\n        It is recommended to save the QR code as image data or to print it for your convenience. Please handle carefully.<br>\r\n        \r\n        *Please keep this email until your screening is finished.\r\n    </p>\r\n\r\n\r\n    <hr style="margin:1em 0;">\r\n\r\n\r\n    <div style="margin-bottom:1em;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">作品名 (Title) :</h3>\r\n        <strong>CYBORG009 CALL OF JUSTICE　第1章</strong><br>\r\n        <span style="font-size:12px;">CYBORG009 CALL OF JUSTICE Chapter1</span>\r\n    </div>\r\n\r\n\r\n    <div style="margin-bottom:1em;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">購入番号 (Transaction number) :</h3>\r\n        <strong>70052007972</strong>\r\n    </div>\r\n\r\n\r\n    <div style="margin-bottom:1em;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">劇場 (Location) :</h3>\r\n        <strong>TOHOシネマズ 六本木ヒルズ スクリーン 7</strong><br>\r\n        東京都港区六本木6-10-2　六本木ヒルズけやき坂コンプレックス内<br>\r\n        <p style="font-size:12px;">\r\n            TOHO CINEMAS Roppongi Hills Screen 7<br>\r\n            Roppongi Hills Keyakizaka Complex, 6-10-2 Roppongi, Minato-ku, Tokyo\r\n        </p>\r\n    </div>\r\n\r\n\r\n    <div style="margin-bottom:1em;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">時間 (Date and time) :</h3>\r\n        <strong>2016/11/01 開場 17:55 開演 18:25</strong><br>\r\n        <span style="font-size:12px;">Open: 17:55/Start: 18:25 on November 01, 2016</span>\r\n    </div>\r\n\r\n\r\n    <div style="margin-bottom:1em;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">券種 (Type of ticket) :</h3>\r\n\r\n        \r\n        \r\n        <strong>一般 / &yen;1,800(税込)\r\n        \r\n\r\n        <p style="font-size:12px;">\r\n            \r\n            \r\n            Adults / &yen;1,800(including tax)\r\n            \r\n        </p>\r\n\r\n    </div>\r\n\r\n    \r\n    <!-- 「コンビニ決済完了」の場合 -->\r\n    <div style="margin-bottom:1em;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">コンビニ決済手数料 (Handling charge) :</h3>\r\n        <strong>&yen;150 x 1</strong>\r\n    </div>\r\n    <!-- /「コンビニ決済完了」の場合 -->\r\n    \r\n\r\n    <div style="margin-bottom:1em;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">購入枚数 (Number of tickets purchased) :</h3>\r\n        <strong>1枚</strong>\r\n        <span style="font-size:12px;">1 ticket(s)</span>\r\n    </div>\r\n\r\n\r\n    \r\n    \r\n    <div style="margin-bottom:1em;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">合計金額 (Total) :</h3>\r\n        <strong>&yen;1,950(税込)</strong>\r\n        <span style="font-size:12px;">1,950 yen (including tax)</span>\r\n    </div>\r\n    \r\n\r\n\r\n    <div style="margin-bottom:1em;page-break-inside:avoid;">\r\n        <h3 style="font-weight:normal;font-size:14px;margin:0;">QRコード (QR-code) :</h3>\r\n\r\n        \r\n        <p>\r\n            <strong>K-27</strong><br>\r\n            <img src="cid:qrcode_5808355c6cba1a1110bec131" alt="K-27">\r\n        </p>\r\n        \r\n    </div>\r\n\r\n\r\n    <p style="font-size:12px;">\r\n        ※学生（小学生は除く）の方は、劇場へのご入場の際に、必ず学生証または生徒手帳のご提示をお願いします。<br>\r\n        \r\n        ※交通渋滞による来場遅延、その他いかなる場合でも、ご購入後のチケットの変更およびキャンセル・払い戻しはいたしません。なお不可抗力により表記公演の興行を中止する場合の払い戻しは、所定の期間内に所定の方法にて行います。<br>\r\n        \r\n        *Students (excluding elementary school students) are asked to show their student ID card or student handbook before entering the cinema.<br>\r\n        \r\n        *Once tickets are purchased, they cannot be changed, canceled or refunded under any circumstance, including delayed arrival due to traffic congestion. If the event is canceled due to any unforeseen causes, tickets will be refunded by the prescribed methods during the prescribed period of time.\r\n        \r\n    </p>\r\n\r\n\r\n    <hr>\r\n\r\n\r\n    <strong style="font-size:14px;">東京国際映画祭  TOKYO INTERNATIONAL FILM FESTIVAL 2016</strong>\r\n    <p style="font-size:14px;">\r\n        本メールアドレスは送信専用です。返信はできませんのであらかじめご了承ください。<br>\r\n        本メールに心当たりのない方やチケットに関してご不明な点は、下記電話番号までお問い合わせください。<br>\r\n        チケットのお問合せ：050-3786-0368　/12:00～18:00（休業：土/日/祝日　東京国際映画祭開催期間中は無休）<br>\r\n        オフィシャルサイト： <a href="http://2016.tiff-jp.net/" target="_blank" style="color:#000;">http://2016.tiff-jp.net/</a>\r\n    </p>\r\n    <p style="font-size:10px;">\r\n        This email was sent from a send-only address. Please do not reply to this message.<br>\r\n        If you are not the intended recipient of this email or have any questions about tickets, Please contact us at the telephone number below.\r\n        For inquiries about tickets: 050-3786-0368/12:00 p.m. to 6:00 p.m. (Closed on Saturdays, Sundays, and national holidays, except during TIFF)\r\n        Official website: <a href="http://2016.tiff-jp.net/" target="_blank" style="color:#000;">http://2016.tiff-jp.net/</a>\r\n    </p>\r\n</div>\r\n\r\n\r\n\r\n\r\n</body>\r\n</html>`;


        let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));
        let email = new _sendgrid.Email({
            to: "nock-japonika.crew@docomo.ne.jp",
            // to: "ilovegadd@gmail.com",
            fromname: conf.get<string>('email.fromname'),
            from: conf.get<string>('email.from'),
            subject: '[dev]東京国際映画祭チケット 購入完了のお知らせ Notice of Completion of TIFF Ticket Purchase',
            html: html
        });

        // 完了の場合、QRコードを添付
        let png = qr.imageSync(`70052007972-0`, {type: 'png'});

        email.addFile({
            filename: `QR_5808355c6cba1a1110bec131.png`,
            contentType: 'image/png',
            cid: `qrcode_5808355c6cba1a1110bec131`,
            content: png
        });

        // add logo
        email.addFile({
            filename: `logo.png`,
            contentType: 'image/png',
            cid: 'logo',
            content: fs.readFileSync(`${__dirname}/../../../../public/images/email/logo.png`)
        });

        this.logger.info('sending an email...email:', email);
        _sendgrid.send(email, (err, json) => {
            this.logger.info('an email sent.', err, json);
            process.exit(0);
        });
    }

    public existByPaymentNos(): void {
        mongoose.connect(MONGOLAB_URI);
        // fs.readFile(`${process.cwd()}/logs/オーダーID差し替えの件/paymentNosOnlyInTIFF.json`, 'utf8', (err, data) => {
        fs.readFile(`${process.cwd()}/logs/オーダーID差し替えの件/paymentNosOnlyInGMO.json`, 'utf8', (err, data) => {
            let paymentNos: Array<string> = JSON.parse(data);

            Models.Reservation.find({
                payment_no: {$in: paymentNos}
            }, (err, reservations) => {
                console.log('reservations.length is', reservations.length);

                mongoose.disconnect();
                process.exit(0);  
            });
        });
    }

    public existInGMOByPaymentNos(): void {
        mongoose.connect(MONGOLAB_URI);
        // fs.readFile(`${process.cwd()}/logs/オーダーID差し替えの件/paymentNosOnlyInTIFF.json`, 'utf8', (err, data) => {
        fs.readFile(`${process.cwd()}/logs/オーダーID差し替えの件/beforeAfter.json`, 'utf8', (err, data) => {
            let changes: Array<any> = JSON.parse(data);

            let promises = changes.map((change) => {
                return new Promise((resolve, reject) => {
                    // 取引状態参照
                    this.logger.info('SearchTrade processing...');
                    request.post({
                        url: (process.env.NODE_ENV === 'prod') ? 'https://p01.mul-pay.jp/payment/SearchTradeMulti.idPass' : 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
                        form: {
                            ShopID: conf.get<string>('gmo_payment_shop_id'),
                            ShopPass: conf.get<string>('gmo_payment_shop_password'),
                            OrderID: change.after,
                            PayType: change.pay_type,
                        }
                    }, (error, response, body) => {
                        if (error) return reject(error); 

                        let searchTradeResult = querystring.parse(body);
                        this.logger.info('searchTradeResult is ', searchTradeResult);
                        resolve();
                    });
                });
            });

            Promise.all(promises).then(() => {
                mongoose.disconnect();
                process.exit(0);  
            }).catch((err) => {
                mongoose.disconnect();
                process.exit(0);  
            });
        });
    }

    /**
     * GMOと購入番号を差し替える
     */
    public changePaymentNos(): void {
        mongoose.connect(MONGOLAB_URI);
        fs.readFile(`${process.cwd()}/logs/オーダーID差し替えの件/beforeAfter.json`, 'utf8', (err, data) => {
            let changes: Array<any> = JSON.parse(data);

            let promises = changes.map((change) => {
                return new Promise((resolve, reject) => {
                    // 取引状態参照
                    this.logger.info('SearchTrade processing...');
                    request.post({
                        url: (process.env.NODE_ENV === 'prod') ? 'https://p01.mul-pay.jp/payment/SearchTradeMulti.idPass' : 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
                        form: {
                            ShopID: conf.get<string>('gmo_payment_shop_id'),
                            ShopPass: conf.get<string>('gmo_payment_shop_password'),
                            OrderID: change.after,
                            PayType: change.pay_type,
                        }
                    }, (error, response, body) => {
                        if (error) return reject(error); 

                        let searchTradeResult = querystring.parse(body);
                        this.logger.info('searchTradeResult is ', searchTradeResult);

                        // DB情報取得
                        Models.Reservation.find({
                            payment_no: change.before,
                            status: ReservationUtil.STATUS_WAITING_SETTLEMENT
                        }, (err, reservations) => {
                            console.log('reservations.length is', reservations.length);
                            if (reservations.length === 0) return resolve();

                            let totalCharge = 0;
                            reservations.forEach((reservation) => {
                                totalCharge += reservation.get('charge');
                            });

                            this.logger.info('PayType is', change.pay_type);
                            this.logger.info('payment_method is', reservations[0].get('payment_method'));
                            this.logger.info('PayType = payment_method ?', (change.pay_type === reservations[0].get('payment_method')));

                            this.logger.info('Amount is', searchTradeResult.Amount);
                            this.logger.info('totalCharge is', totalCharge);
                            this.logger.info('Amount = charge ?', (parseInt(searchTradeResult.Amount) === totalCharge));



                            let promises2 = reservations.map((reservation) => {
                                return new Promise((resolve2, reject2) => {

                                    let update = {
                                        payment_no: change.after,
                                        payment_method: change.pay_type
                                    };

                                    if (change.pay_type === GMOUtil.PAY_TYPE_CREDIT && reservation.get('payment_method') === GMOUtil.PAY_TYPE_CVS) {
                                        update['charge'] = reservation.get('charge') - 150;
                                    } else if (change.pay_type === GMOUtil.PAY_TYPE_CVS && reservation.get('payment_method') === GMOUtil.PAY_TYPE_CREDIT) {
                                        update['charge'] = reservation.get('charge') + 150;
                                    }

                                    if (searchTradeResult.Status === GMOUtil.STATUS_CREDIT_CAPTURE || searchTradeResult.Status === GMOUtil.STATUS_CVS_PAYSUCCESS) {
                                        update['status'] = ReservationUtil.STATUS_RESERVED;
                                    }

                                    this.logger.info('updating...update:', update);
                                    Models.Reservation.findOneAndUpdate({
                                        _id: reservation.get('_id')
                                    }, update, {new: true}, (err, reservation) => {
                                        this.logger.info('updated', err, reservation);
                                        if (err) return reject2(err);

                                        resolve2();

                                        // メールキュー作成(いったん保留)
                                        // Models.ReservationEmailCue.create({
                                        //     payment_no: reservation.get('payment_no'),
                                        //     is_sent: false
                                        // }, (err, cue) => {
                                        //     this.logger.info('reservationEmailCue created.', err, cue);
                                        //     (err) ? reject2(err) : resolve2();
                                        // });
                                    });

                                    // resolve2();
                                });
                            });

                            Promise.all(promises2).then(() => {
                                resolve();
                            }).catch((err) => {
                                reject(err);
                            });
                        });
                    });
                });
            });

            Promise.all(promises).then(() => {
                mongoose.disconnect();
                process.exit(0);  
            }).catch((err) => {
                mongoose.disconnect();
                process.exit(0);  
            });
        });
    }
}
