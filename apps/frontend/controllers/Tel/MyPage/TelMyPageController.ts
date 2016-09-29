import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ScreenUtil from '../../../../common/models/Screen/ScreenUtil';
import Models from '../../../../common/models/Models';
import moment = require('moment');

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
    public search(): void {
        let limit: number = (this.req.query.limit) ? parseInt(this.req.query.limit) : 10;
        let page: number = (this.req.query.page) ? parseInt(this.req.query.page) : 1;

        let purchaserGroups: Array<string> = (this.req.query.purchaser_groups) ? this.req.query.purchaser_groups.split(',') : null;
        let purchasedDay: string = (this.req.query.purchased_day) ? this.req.query.purchased_day : null;
        let email: string = (this.req.query.email) ? this.req.query.email : null;
        let tel: string = (this.req.query.tel) ? this.req.query.tel : null;
        let purchaserFirstName: string = (this.req.query.purchaser_first_name) ? this.req.query.purchaser_first_name : null;
        let purchaserLastName: string = (this.req.query.purchaser_last_name) ? this.req.query.purchaser_last_name : null;
        let paymentNo: string = (this.req.query.payment_no) ? this.req.query.payment_no : null;

        // 検索条件を作成
        let conditions: Array<Object> = [];

        // 内部関係者以外がデフォルト
        conditions.push(
            {
                purchaser_group: {$ne: ReservationUtil.PURCHASER_GROUP_STAFF},
                status: {$in: [ReservationUtil.STATUS_RESERVED, ReservationUtil.STATUS_WAITING_SETTLEMENT, ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN]}
            }
        );

        if (purchaserGroups) {
            conditions.push({purchaser_group: {$in: purchaserGroups}});
        }

        // 購入日条件
        if (purchasedDay) {
            conditions.push(
                {
                    purchased_at: {
                        $gte: moment(`${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T00:00:00+9:00`),
                        $lte: moment(`${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T23:59:59+9:00`)
                    }
                }
            );
        }

        if (email) {
            conditions.push({purchaser_email: {$regex: `${email}`}});
        }
        if (tel) {
            conditions.push({purchaser_tel: {$regex: `${tel}`}});
        }

        // 空白つなぎでAND検索
        if (purchaserFirstName) {
            // trim and to half-width space
            purchaserFirstName = purchaserFirstName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            purchaserFirstName.split(' ').forEach((regex) => {
                if (regex.length > 0) {
                    conditions.push({purchaser_first_name: {$regex: `${regex}`}});
                }
            });
        }
        // 空白つなぎでAND検索
        if (purchaserLastName) {
            // trim and to half-width space
            purchaserLastName = purchaserLastName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            purchaserLastName.split(' ').forEach((regex) => {
                if (regex.length > 0) {
                    conditions.push({purchaser_last_name: {$regex: `${regex}`}});
                }
            });
        }

        if (paymentNo) {
            // remove space characters
            paymentNo = Util.toHalfWidth(paymentNo.replace(/\s/g, ''));
            conditions.push({payment_no: {$regex: `${paymentNo}`}});
        }



        // 総数検索
        Models.Reservation.count(
            {
                $and: conditions
            },
            (err, count) => {
                if (err) {
                    return this.res.json({
                        success: false,
                        results: [],
                        count: 0
                    });
                }

                Models.Reservation.find({$and: conditions})
                .skip(limit * (page - 1))
                .limit(limit)
                .lean(true)
                .exec((err, reservations: Array<any>) => {
                    if (err) {
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
        );
    }
}
