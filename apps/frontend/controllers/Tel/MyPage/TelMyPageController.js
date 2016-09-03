"use strict";
const BaseController_1 = require('../../BaseController');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const Models_1 = require('../../../../common/models/Models');
const moment = require('moment');
class TelMyPageController extends BaseController_1.default {
    constructor(...args) {
        super(...args);
        this.layout = 'layouts/tel/layout';
    }
    index() {
        this.res.render('tel/mypage/index', {
            ReservationUtil: ReservationUtil_1.default
        });
    }
    /**
     * マイページ予約検索
     */
    search() {
        let limit = (this.req.query.limit) ? this.req.query.limit : 10;
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let purchaserGroups = (this.req.query.purchaser_groups) ? this.req.query.purchaser_groups.split(',') : null;
        let purchasedDay = (this.req.query.purchased_day) ? this.req.query.purchased_day : null;
        let email = (this.req.query.email) ? this.req.query.email : null;
        let tel = (this.req.query.tel) ? this.req.query.tel : null;
        let purchaser_name = (this.req.query.purchaser_name) ? this.req.query.purchaser_name : null;
        // 検索条件を作成
        let conditions = [];
        // 内部関係者以外がデフォルト
        conditions.push({
            purchaser_group: { $ne: ReservationUtil_1.default.PURCHASER_GROUP_STAFF },
            status: ReservationUtil_1.default.STATUS_RESERVED
        });
        if (purchaserGroups) {
            conditions.push({ purchaser_group: { $in: purchaserGroups } });
        }
        // 購入日条件
        if (purchasedDay) {
            conditions.push({
                purchased_at: {
                    $gte: moment(`${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T00:00:00+9:00`),
                    $lte: moment(`${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T23:59:59+9:00`)
                }
            });
        }
        if (email) {
            conditions.push({ purchaser_email: { $regex: `${email}` } });
        }
        if (tel) {
            conditions.push({ purchaser_tel: { $regex: `${tel}` } });
        }
        if (purchaser_name) {
            conditions.push({
                $or: [
                    {
                        purchaser_last_name: { $regex: `${purchaser_name}` }
                    },
                    {
                        purchaser_first_name: { $regex: `${purchaser_name}` }
                    }
                ]
            });
        }
        // 総数検索
        Models_1.default.Reservation.count({
            $and: conditions
        }, (err, count) => {
            if (err) {
                return this.res.json({
                    success: false,
                    results: [],
                    count: 0
                });
            }
            Models_1.default.Reservation.find({
                $and: conditions
            }, {}, {
                sort: { staff: 1, seat_code: 1 }
            })
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
                }
                else {
                    conditions['page'] = page;
                    this.res.json({
                        success: true,
                        results: reservations,
                        count: count
                    });
                }
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TelMyPageController;
