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
const _ = require("underscore");
const Util = require("../../../../common/Util/Util");
const BaseController_1 = require("../../BaseController");
const DEFAULT_RADIX = 10;
/**
 * 外部関係者舞マイページコントトーラー
 *
 * @export
 * @class SponsorMyPageController
 * @extends {BaseController}
 */
class SponsorMyPageController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/sponsor/layout';
    }
    index() {
        this.res.render('sponsor/mypage/index');
    }
    /**
     * マイページ予約検索
     */
    search() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.sponsorUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            // tslint:disable-next-line:no-magic-numbers
            const limit = (!_.isEmpty(this.req.query.limit)) ? parseInt(this.req.query.limit, DEFAULT_RADIX) : 10;
            const page = (!_.isEmpty(this.req.query.page)) ? parseInt(this.req.query.page, DEFAULT_RADIX) : 1;
            const tel = (!_.isEmpty(this.req.query.tel)) ? this.req.query.tel : null;
            const purchaserName = (!_.isEmpty(this.req.query.purchaser_name)) ? this.req.query.purchaser_name : null;
            let paymentNo = (!_.isEmpty(this.req.query.payment_no)) ? this.req.query.payment_no : null;
            // 検索条件を作成
            const conditions = [];
            conditions.push({
                purchaser_group: chevre_domain_1.ReservationUtil.PURCHASER_GROUP_SPONSOR,
                sponsor: this.req.sponsorUser.get('_id'),
                status: chevre_domain_1.ReservationUtil.STATUS_RESERVED
            });
            if (tel !== null) {
                conditions.push({
                    $or: [
                        {
                            purchaser_tel: { $regex: `${tel}` }
                        }
                    ]
                });
            }
            if (purchaserName !== null) {
                conditions.push({
                    $or: [
                        {
                            purchaser_last_name: { $regex: `${purchaserName}` }
                        },
                        {
                            purchaser_first_name: { $regex: `${purchaserName}` }
                        }
                    ]
                });
            }
            if (paymentNo !== null) {
                // remove space characters
                paymentNo = Util.toHalfWidth(paymentNo.replace(/\s/g, ''));
                conditions.push({ payment_no: { $regex: `${paymentNo}` } });
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
exports.default = SponsorMyPageController;
