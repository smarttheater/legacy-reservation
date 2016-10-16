import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import mongoose = require('mongoose');
import conf = require('config');
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import GMOUtil from '../../../common/Util/GMO/GMOUtil';
import Util from '../../../common/Util/Util';
import fs = require('fs-extra');
import request = require('request');
import querystring = require('querystring');

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
}
