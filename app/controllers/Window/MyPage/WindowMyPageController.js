"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const gmo_service_1 = require("@motionpicture/gmo-service");
const moment = require("moment");
const _ = require("underscore");
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
            GMOUtil: gmo_service_1.Util,
            ReservationUtil: chevre_domain_1.ReservationUtil
        });
    }
    /**
     * マイページ予約検索
     */
    // tslint:disable-next-line:max-func-body-length cyclomatic-complexity
    search() {
        return __awaiter(this, void 0, void 0, function* () {
            // tslint:disable-next-line:no-magic-numbers
            const limit = (!_.isEmpty(this.req.query.limit)) ? parseInt(this.req.query.limit, DEFAULT_RADIX) : 10;
            const page = (!_.isEmpty(this.req.query.page)) ? parseInt(this.req.query.page, DEFAULT_RADIX) : 1;
            const purchaserGroups = (!_.isEmpty(this.req.query.purchaser_groups)) ? this.req.query.purchaser_groups.split(',') : [];
            const purchasedDay = (!_.isEmpty(this.req.query.purchased_day)) ? this.req.query.purchased_day : null;
            let email = (!_.isEmpty(this.req.query.email)) ? this.req.query.email : null;
            let tel = (!_.isEmpty(this.req.query.tel)) ? this.req.query.tel : null;
            let purchaserFirstName = (!_.isEmpty(this.req.query.purchaser_first_name)) ? this.req.query.purchaser_first_name : null;
            let purchaserLastName = (!_.isEmpty(this.req.query.purchaser_last_name)) ? this.req.query.purchaser_last_name : null;
            let paymentNo = (!_.isEmpty(this.req.query.payment_no)) ? this.req.query.payment_no : null;
            const day = (!_.isEmpty(this.req.query.day)) ? this.req.query.day : null;
            let filmName = (!_.isEmpty(this.req.query.film_name)) ? this.req.query.film_name : null;
            // 検索条件を作成
            const conditions = [];
            // 内部関係者以外がデフォルト
            conditions.push({
                purchaser_group: { $ne: chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF },
                status: {
                    $in: [
                        chevre_domain_1.ReservationUtil.STATUS_RESERVED,
                        chevre_domain_1.ReservationUtil.STATUS_WAITING_SETTLEMENT,
                        chevre_domain_1.ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN
                    ]
                }
            });
            if (purchaserGroups.length > 0) {
                conditions.push({ purchaser_group: { $in: purchaserGroups } });
            }
            // 購入日条件
            if (purchasedDay !== null) {
                conditions.push({
                    purchased_at: {
                        $gte: moment(
                        // tslint:disable-next-line:no-magic-numbers
                        `${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T00:00:00+09:00`),
                        $lte: moment(
                        // tslint:disable-next-line:no-magic-numbers
                        `${purchasedDay.substr(0, 4)}-${purchasedDay.substr(4, 2)}-${purchasedDay.substr(6, 2)}T23:59:59+09:00`)
                    }
                });
            }
            if (email !== null) {
                // remove space characters
                email = chevre_domain_1.CommonUtil.toHalfWidth(email.replace(/\s/g, ''));
                conditions.push({ purchaser_email: { $regex: new RegExp(email, 'i') } });
            }
            if (tel !== null) {
                // remove space characters
                tel = chevre_domain_1.CommonUtil.toHalfWidth(tel.replace(/\s/g, ''));
                conditions.push({ purchaser_tel: { $regex: new RegExp(tel, 'i') } });
            }
            // 空白つなぎでAND検索
            if (purchaserFirstName !== null) {
                // trim and to half-width space
                purchaserFirstName = purchaserFirstName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
                purchaserFirstName.split(' ').forEach((pattern) => {
                    if (pattern.length > 0) {
                        conditions.push({ purchaser_first_name: { $regex: new RegExp(pattern, 'i') } });
                    }
                });
            }
            // 空白つなぎでAND検索
            if (purchaserLastName !== null) {
                // trim and to half-width space
                purchaserLastName = purchaserLastName.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
                purchaserLastName.split(' ').forEach((pattern) => {
                    if (pattern.length > 0) {
                        conditions.push({ purchaser_last_name: { $regex: new RegExp(pattern, 'i') } });
                    }
                });
            }
            if (paymentNo !== null) {
                // remove space characters
                paymentNo = chevre_domain_1.CommonUtil.toHalfWidth(paymentNo.replace(/\s/g, ''));
                conditions.push({ payment_no: { $regex: new RegExp(paymentNo, 'i') } });
            }
            if (day !== null) {
                conditions.push({ performance_day: day });
            }
            // 空白つなぎでAND検索
            if (filmName !== null) {
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
            try {
                // 総数検索
                const count = yield chevre_domain_1.Models.Reservation.count({
                    $and: conditions
                }).exec();
                const reservations = yield chevre_domain_1.Models.Reservation.find({ $and: conditions })
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .lean(true)
                    .exec();
                // ソート昇順(上映日→開始時刻→スクリーン→座席コード)
                reservations.sort((a, b) => {
                    if (a.performance_day > b.performance_day)
                        return 1;
                    if (a.performance_start_time > b.performance_start_time)
                        return 1;
                    if (a.screen > b.screen)
                        return 1;
                    return chevre_domain_1.ScreenUtil.sortBySeatCode(a.seat_code, b.seat_code);
                });
                this.res.json({
                    success: true,
                    results: reservations,
                    count: count
                });
            }
            catch (error) {
                console.error(error);
                this.res.json({
                    success: false,
                    results: [],
                    count: 0
                });
            }
        });
    }
}
exports.default = WindowMyPageController;
