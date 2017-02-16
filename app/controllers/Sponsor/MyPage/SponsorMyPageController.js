"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const ttts_domain_3 = require("@motionpicture/ttts-domain");
const Util_1 = require("../../../../common/Util/Util");
const BaseController_1 = require("../../BaseController");
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
        const limit = (this.req.query.limit) ? parseInt(this.req.query.limit) : 10;
        const page = (this.req.query.page) ? parseInt(this.req.query.page) : 1;
        const tel = (this.req.query.tel) ? this.req.query.tel : null;
        const purchaserName = (this.req.query.purchaser_name) ? this.req.query.purchaser_name : null;
        let paymentNo = (this.req.query.payment_no) ? this.req.query.payment_no : null;
        // 検索条件を作成
        const conditions = [];
        conditions.push({
            purchaser_group: ttts_domain_1.ReservationUtil.PURCHASER_GROUP_SPONSOR,
            sponsor: this.req.sponsorUser.get('_id'),
            status: ttts_domain_1.ReservationUtil.STATUS_RESERVED
        });
        if (tel) {
            conditions.push({
                $or: [
                    {
                        purchaser_tel: { $regex: `${tel}` }
                    }
                ]
            });
        }
        if (purchaserName) {
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
        if (paymentNo) {
            // remove space characters
            paymentNo = Util_1.default.toHalfWidth(paymentNo.replace(/\s/g, ''));
            conditions.push({ payment_no: { $regex: `${paymentNo}` } });
        }
        // 総数検索
        ttts_domain_3.Models.Reservation.count({
            $and: conditions
        }, (err, count) => {
            if (err) {
                return this.res.json({
                    success: false,
                    results: [],
                    count: 0
                });
            }
            ttts_domain_3.Models.Reservation.find({ $and: conditions })
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
                    // ソート昇順(上映日→開始時刻→スクリーン→座席コード)
                    reservations.sort((a, b) => {
                        if (a.performance_day > b.performance_day)
                            return 1;
                        if (a.performance_start_time > b.performance_start_time)
                            return 1;
                        if (a.screen > b.screen)
                            return 1;
                        return ttts_domain_2.ScreenUtil.sortBySeatCode(a.seat_code, b.seat_code);
                    });
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
exports.default = SponsorMyPageController;
