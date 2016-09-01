import BaseController from '../BaseController';
import Constants from '../../../common/Util/Constants';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import conf = require('config');
import mongoose = require('mongoose');
import fs = require('fs-extra');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class StaffController extends BaseController {
    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/staffs.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let staffs = JSON.parse(data);

            // パスワードハッシュ化
            staffs = staffs.map((staff) => {
                let password_salt = Util.createToken();
                staff['password_salt'] = password_salt;
                staff['password_hash'] = Util.createHash(staff.password, password_salt);
                delete staff['password'];
                return staff;
            });
            this.logger.info('removing all staffs...');
            Models.Staff.remove({}, (err) => {
                this.logger.debug('creating staffs...');
                Models.Staff.create(
                    staffs,
                    (err) => {
                        this.logger.info('staffs created.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    }
                );
            });
        });
    }

    /**
     * スクリーン指定で内部関係者の先抑えを実行する
     */
    public createReservationsFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        // スクリーンごとに内部予約を追加する
        Models.Screen.distinct('_id', (err, screenIds) => {
            let i = 0;
            let next = () => {
                if (i < screenIds.length) {
                    this.createStaffReservationsByScreenId(screenIds[i].toString(), (err) => {
                        i++;
                        next();
                    });
                } else {
                    this.logger.info('end.');
                    mongoose.disconnect();
                    process.exit(0);
                }
            }

            next();
        });
    }

    private createStaffReservationsByScreenId(screenId: string, cb: (err: Error) => void): void {
        let promises = [];

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/staffReservations_${screenId}.json`, 'utf8', (err, data) => {
            if (err) {
                this.logger.info('no reservations.');
                cb(null);
            };

            // 内部関係者をすべて取得
            Models.Staff.find({}, (err, staffs) => {
                let staffsByName = {};
                for (let staff of staffs) {
                    staffsByName[staff.get('name')] = staff;
                }

                // スクリーンのパフォーマンスをすべて取得
                Models.Performance.find(
                    {
                        screen: screenId
                    },
                    'day start_time end_time film screen theater' // 必要な項目だけ指定すること
                )
                .populate('film', 'name ticket_type_group image is_mx4d') // 必要な項目だけ指定すること
                .populate('screen', 'name') // 必要な項目だけ指定すること
                .populate('theater', 'name') // 必要な項目だけ指定すること
                .exec((err, performances) => {
                    for (let performance of performances) {
                        let reservations = JSON.parse(data);
                        reservations = reservations.map((reservation) => {
                            // 以下項目を共通でreservationに追加する
                            return Object.assign(reservation, {
                                "performance": performance.get('_id'),
                                "status": "RESERVED",
                                "staff": staffsByName[reservation.staff_name].get('_id'),
                                "staff_user_id": staffsByName[reservation.staff_name].get('user_id'),
                                "staff_email": staffsByName[reservation.staff_name].get('email'),
                                "staff_signature": "system",
                                "entered": false,
                                "updated_user": "system",
                                "purchased_at": "2016-09-01T06:38:28Z",
                                "watcher_name_updated_at": null,
                                "watcher_name": "",
                                "film_is_mx4d": performance.get('film').get('is_mx4d'),
                                "film_image": performance.get('film').get('image'),
                                "film_name_en": performance.get('film').get('name.en'),
                                "film_name_ja": performance.get('film').get('name.ja'),
                                "film": performance.get('film').get('_id'),
                                "screen_name_en": performance.get('screen').get('name.en'),
                                "screen_name_ja": performance.get('screen').get('name.ja'),
                                "screen": performance.get('screen').get('_id'),
                                "theater_name_en": performance.get('theater').get('name.en'),
                                "theater_name_ja": performance.get('theater').get('name.ja'),
                                "theater": performance.get('theater').get('_id'),
                                "performance_end_time": performance.get('end_time'),
                                "performance_start_time": performance.get('start_time'),
                                "performance_day": performance.get('day'),
                                "purchaser_group": "04",
                                "payment_no": "1111118119", // TODO どうしよう？
                                "charge": 0,
                                "total_charge": 0,
                                "ticket_type_charge": 0,
                                "ticket_type_name_en": "Free",
                                "ticket_type_name_ja": "無料",
                                "ticket_type_code": "00",
                                "seat_grade_additional_charge": 0,
                                "seat_grade_name_en": "Normal Seat",
                                "seat_grade_name_ja": "ノーマルシート"
                            });
                        });

                        promises.push(new Promise((resolve, reject) => {
                            this.logger.debug('creating staff reservations...');
                            Models.Reservation.create(
                                reservations,
                                (err) => {
                                    this.logger.info('staff reservations created.', err);
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve();
                                    }
                                }
                            );
                        }));
                    }

                    Promise.all(promises).then(() => {
                        this.logger.info('promised.');
                        cb(null);
                    }, (err) => {
                        this.logger.info('promised.', err);
                        cb(err);
                    });
                });
            });
        });
    }
}
