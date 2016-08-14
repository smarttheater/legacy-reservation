import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import Models from '../../../../common/models/Models';

export default class WindowMyPageController extends BaseController {
    public index(): void {
        this.res.render('window/mypage/index', {
            layout: 'layouts/window/layout',
            ReservationUtil: ReservationUtil
        });
    }

    /**
     * マイページ予約検索
     */
    public search(): void {
        let limit = 2;
        let page = (this.req.query.page) ? this.req.query.page : 1;

        let purchaserGroups = (this.req.query.purchaser_groups) ? this.req.query.purchaser_groups.split(',') : null;
        let day = (this.req.query.day) ? this.req.query.day : null;
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

        if (day) { // TODO 予約確定日時が必要か？
            // conditions.push({theater: theater});
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
                        isSuccess: false,
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
                .exec((err, reservations) => {
                    if (err) {
                        this.res.json({
                            isSuccess: false,
                            results: [],
                            count: 0
                        });
                    } else {
                        conditions['page'] = page;

                        this.res.json({
                            isSuccess: true,
                            // conditions: conditions,
                            results: reservations,
                            count: count
                        });
                    }
                });
            }
        );
    }
}
