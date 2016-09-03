import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import Models from '../../../../common/models/Models';
import moment = require('moment');

export default class TelMyPageController extends BaseController {
    public layout = 'layouts/tel/layout';

    public index(): void {
        this.res.render('tel/mypage/index', {
            ReservationUtil: ReservationUtil
        });
    }

    /**
     * マイページ予約検索
     */
    public search(): void {
        let limit = (this.req.query.limit) ? this.req.query.limit : 10;
        let page = (this.req.query.page) ? this.req.query.page : 1;

        let purchaserGroups = (this.req.query.purchaser_groups) ? this.req.query.purchaser_groups.split(',') : null;
        let purchasedDay = (this.req.query.purchased_day) ? this.req.query.purchased_day : null;
        let email = (this.req.query.email) ? this.req.query.email : null;
        let tel = (this.req.query.tel) ? this.req.query.tel : null;
        let purchaser_name = (this.req.query.purchaser_name) ? this.req.query.purchaser_name : null;

        // 検索条件を作成
        let conditions: Array<Object> = [];

        // 内部関係者以外がデフォルト
        conditions.push(
            {
                purchaser_group: {$ne: ReservationUtil.PURCHASER_GROUP_STAFF},
                status: ReservationUtil.STATUS_RESERVED
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
        if (purchaser_name) {
            conditions.push({
                $or: [
                    {
                        purchaser_last_name: {$regex: `${purchaser_name}`}
                    },
                    {
                        purchaser_first_name: {$regex: `${purchaser_name}`}
                    }
                ]
            });
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

                Models.Reservation.find(
                    {
                        $and: conditions
                    },
                    {},
                    {
                        sort : {staff: 1, seat_code: 1}
                    }
                )
                .skip(limit * (page - 1))
                .limit(limit)
                .lean(true)
                .exec((err, reservations) => {
                    if (err) {
                        this.res.json({
                            success: false,
                            results: [],
                            count: 0
                        });
                    } else {
                        conditions['page'] = page;

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
