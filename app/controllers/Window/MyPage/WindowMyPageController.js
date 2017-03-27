"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const chevre_domain_3 = require("@motionpicture/chevre-domain");
const moment = require("moment");
const GMOUtil = require("../../../../common/Util/GMO/GMOUtil");
const Util = require("../../../../common/Util/Util");
const BaseController_1 = require("../../BaseController");
const DEFAULT_RADIX = 10;
/**
 * 当日窓口マイページコントローラー
 *
 * @export
 * @class WindowMyPageController
 * @extends {BaseController}
 */
class WindowMyPageController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/window/layout';
    }
    index() {
        this.res.render('window/mypage/index', {
            GMOUtil: GMOUtil,
            ReservationUtil: chevre_domain_1.ReservationUtil
        });
    }
    /**
     * マイページ予約検索
     */
    // tslint:disable-next-line:max-func-body-length
    search() {
        // tslint:disable-next-line:no-magic-numbers
        const limit = (this.req.query.limit) ? parseInt(this.req.query.limit, DEFAULT_RADIX) : 10;
        const page = (this.req.query.page) ? parseInt(this.req.query.page, DEFAULT_RADIX) : 1;
        const purchaserGroups = (this.req.query.purchaser_groups) ? this.req.query.purchaser_groups.split(',') : null;
        const purchasedDay = (this.req.query.purchased_day) ? this.req.query.purchased_day : null;
        let email = (this.req.query.email) ? this.req.query.email : null;
        let tel = (this.req.query.tel) ? this.req.query.tel : null;
        let purchaserFirstName = (this.req.query.purchaser_first_name) ? this.req.query.purchaser_first_name : null;
        let purchaserLastName = (this.req.query.purchaser_last_name) ? this.req.query.purchaser_last_name : null;
        let paymentNo = (this.req.query.payment_no) ? this.req.query.payment_no : null;
        const day = (this.req.query.day) ? this.req.query.day : null;
        let filmName = (this.req.query.film_name) ? this.req.query.film_name : null;
        // 検索条件を作成
        const conditions = [];
        // 内部関係者以外がデフォルト
        conditions.push({
            purchaser_group: { $ne: chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF },
            status: { $in: [chevre_domain_1.ReservationUtil.STATUS_RESERVED, chevre_domain_1.ReservationUtil.STATUS_WAITING_SETTLEMENT, chevre_domain_1.ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN] }
        });
        if (purchaserGroups) {
            conditions.push({ purchaser_group: { $in: purchaserGroups } });
        }
        // 購入日条件
        if (purchasedDay) {
            conditions.push({
                purchased_at: {
                    // tslint:disable-next-line:no-magic-numbers
                    $gte: moment(`${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T00:00:00+09:00`),
                    // tslint:disable-next-line:no-magic-numbers
                    $lte: moment(`${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T23:59:59+09:00`)
                }
            });
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
        chevre_domain_3.Models.Reservation.count({
            $and: conditions
        }, (err, count) => {
            if (err) {
                this.res.json({
                    success: false,
                    results: [],
                    count: 0
                });
            }
            else {
                chevre_domain_3.Models.Reservation.find({ $and: conditions })
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .lean(true)
                    .exec((findReservationErr, reservations) => {
                    if (findReservationErr) {
                        this.res.json({
                            success: false,
                            results: [],
                            count: 0
                        });
                    }
                    else {
                        // ソート昇順(上映日→開始時刻→スクリーン→座席コード)
                        reservations.sort((a, b) => {
                            if (a.performance_day > b.performance_day)
                                return 1;
                            if (a.performance_start_time > b.performance_start_time)
                                return 1;
                            if (a.screen > b.screen)
                                return 1;
                            return chevre_domain_2.ScreenUtil.sortBySeatCode(a.seat_code, b.seat_code);
                        });
                        this.res.json({
                            success: true,
                            results: reservations,
                            count: count
                        });
                    }
                });
            }
        });
    }
}
exports.default = WindowMyPageController;
