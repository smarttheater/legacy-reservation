import { ReservationUtil } from '@motionpicture/ttts-domain';
import { ScreenUtil } from '@motionpicture/ttts-domain';
import { Models } from '@motionpicture/ttts-domain';
import * as moment from 'moment';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import Util from '../../../../common/Util/Util';
import BaseController from '../../BaseController';

const DEFAULT_RADIX = 10;

export default class TelMyPageController extends BaseController {
    public layout = 'layouts/tel/layout';

    public index(): void {
        this.res.render('tel/mypage/index', {
            GMOUtil: GMOUtil,
            ReservationUtil: ReservationUtil
        });
    }

    /**
     * マイページ予約検索
     */
    // tslint:disable-next-line:max-func-body-length
    public search(): void {
        // tslint:disable-next-line:no-magic-numbers
        const limit: number = (this.req.query.limit) ? parseInt(this.req.query.limit, DEFAULT_RADIX) : 10;
        const page: number = (this.req.query.page) ? parseInt(this.req.query.page, DEFAULT_RADIX) : 1;

        const purchaserGroups: string[] = (this.req.query.purchaser_groups) ? this.req.query.purchaser_groups.split(',') : null;
        const purchasedDay: string = (this.req.query.purchased_day) ? this.req.query.purchased_day : null;
        let email: string = (this.req.query.email) ? this.req.query.email : null;
        let tel: string = (this.req.query.tel) ? this.req.query.tel : null;
        let purchaserFirstName: string = (this.req.query.purchaser_first_name) ? this.req.query.purchaser_first_name : null;
        let purchaserLastName: string = (this.req.query.purchaser_last_name) ? this.req.query.purchaser_last_name : null;
        let paymentNo: string = (this.req.query.payment_no) ? this.req.query.payment_no : null;
        const day: string = (this.req.query.day) ? this.req.query.day : null;
        let filmName: string = (this.req.query.film_name) ? this.req.query.film_name : null;

        // 検索条件を作成
        const conditions: Object[] = [];

        // 内部関係者以外がデフォルト
        conditions.push(
            {
                purchaser_group: { $ne: ReservationUtil.PURCHASER_GROUP_STAFF },
                status: { $in: [ReservationUtil.STATUS_RESERVED, ReservationUtil.STATUS_WAITING_SETTLEMENT, ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN] }
            }
        );

        if (purchaserGroups) {
            conditions.push({ purchaser_group: { $in: purchaserGroups } });
        }

        // 購入日条件
        if (purchasedDay) {
            conditions.push(
                {
                    purchased_at: {
                        // tslint:disable-next-line:no-magic-numbers
                        $gte: moment(`${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T00:00:00+9:00`),
                        // tslint:disable-next-line:no-magic-numbers
                        $lte: moment(`${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T23:59:59+9:00`)
                    }
                }
            );
        }

        if (email) {
            // remove space characters
            email = Util.toHalfWidth(email.replace(/\s/g, ''));
            conditions.push({ purchaser_email: { $regex: new RegExp(email, 'i') } });
        }

        if (tel) {
            // remove space characters
            tel = Util.toHalfWidth(tel.replace(/\s/g, ''));
            conditions.push({ purchaser_tel: { $regex: new RegExp(tel, 'i') } });
        }

        // 空白つなぎでAND検索
        if (purchaserFirstName) {
            // trim and to half-width space
            purchaserFirstName = purchaserFirstName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            purchaserFirstName.split(' ').forEach((pattern) => {
                if (pattern.length > 0) {
                    conditions.push({ purchaser_first_name: { $regex: new RegExp(pattern, 'i') } });
                }
            });
        }
        // 空白つなぎでAND検索
        if (purchaserLastName) {
            // trim and to half-width space
            purchaserLastName = purchaserLastName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            purchaserLastName.split(' ').forEach((pattern) => {
                if (pattern.length > 0) {
                    conditions.push({ purchaser_last_name: { $regex: new RegExp(pattern, 'i') } });
                }
            });
        }

        if (paymentNo) {
            // remove space characters
            paymentNo = Util.toHalfWidth(paymentNo.replace(/\s/g, ''));
            conditions.push({ payment_no: { $regex: new RegExp(paymentNo, 'i') } });
        }

        if (day) {
            conditions.push({ performance_day: day });
        }

        // 空白つなぎでAND検索
        if (filmName) {
            // trim and to half-width space
            filmName = filmName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            filmName.split(' ').forEach((pattern) => {
                if (pattern.length > 0) {
                    const regex = new RegExp(pattern, 'i');
                    conditions.push({
                        $or: [
                            {
                                film_name_ja: { $regex: regex }
                            },
                            {
                                film_name_en: { $regex: regex }
                            }
                        ]
                    });
                }
            });
        }

        // 総数検索
        Models.Reservation.count(
            {
                $and: conditions
            },
            (err, count) => {
                if (err) {
                    this.res.json({
                        success: false,
                        results: [],
                        count: 0
                    });
                } else {
                    Models.Reservation.find({ $and: conditions })
                        .skip(limit * (page - 1))
                        .limit(limit)
                        .lean(true)
                        .exec((findReservationErr, reservations: any[]) => {
                            if (findReservationErr) {
                                this.res.json({
                                    success: false,
                                    results: [],
                                    count: 0
                                });
                            } else {
                                // ソート昇順(上映日→開始時刻→スクリーン→座席コード)
                                reservations.sort((a, b) => {
                                    if (a.performance_day > b.performance_day) return 1;
                                    if (a.performance_start_time > b.performance_start_time) return 1;
                                    if (a.screen > b.screen) return 1;
                                    return ScreenUtil.sortBySeatCode(a.seat_code, b.seat_code);
                                });

                                this.res.json({
                                    success: true,
                                    results: reservations,
                                    count: count
                                });
                            }
                        });
                }
            }
        );
    }
}
