"use strict";
const BaseController_1 = require('../../BaseController');
const Util_1 = require('../../../../common/Util/Util');
const GMOUtil_1 = require('../../../../common/Util/GMO/GMOUtil');
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
            GMOUtil: GMOUtil_1.default,
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
        let purchaserFirstName = (this.req.query.purchaser_first_name) ? this.req.query.purchaser_first_name : null;
        let purchaserLastName = (this.req.query.purchaser_last_name) ? this.req.query.purchaser_last_name : null;
        let paymentNo = (this.req.query.payment_no) ? this.req.query.payment_no : null;
        // 検索条件を作成
        let conditions = [];
        // 内部関係者以外がデフォルト
        conditions.push({
            purchaser_group: { $ne: ReservationUtil_1.default.PURCHASER_GROUP_STAFF },
            status: { $in: [ReservationUtil_1.default.STATUS_RESERVED, ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT, ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT_PAY_DESIGN] }
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
        // 空白つなぎでAND検索
        if (purchaserFirstName) {
            // trim and to half-width space
            purchaserFirstName = purchaserFirstName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            purchaserFirstName.split(' ').forEach((regex) => {
                if (regex.length > 0) {
                    conditions.push({ purchaser_first_name: { $regex: `${regex}` } });
                }
            });
        }
        // 空白つなぎでAND検索
        if (purchaserLastName) {
            // trim and to half-width space
            purchaserLastName = purchaserLastName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            purchaserLastName.split(' ').forEach((regex) => {
                if (regex.length > 0) {
                    conditions.push({ purchaser_last_name: { $regex: `${regex}` } });
                }
            });
        }
        if (paymentNo) {
            // remove space characters
            paymentNo = Util_1.default.toHalfWidth(paymentNo.replace(/\s/g, ''));
            conditions.push({ payment_no: { $regex: `${paymentNo}` } });
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
            }, null, {
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
