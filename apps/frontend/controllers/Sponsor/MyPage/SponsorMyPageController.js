"use strict";
const BaseController_1 = require('../../BaseController');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const Models_1 = require('../../../../common/models/Models');
class SponsorMyPageController extends BaseController_1.default {
    constructor(...args) {
        super(...args);
        this.layout = 'layouts/sponsor/layout';
    }
    index() {
        this.res.render('sponsor/mypage/index');
    }
    /**
     * マイページ予約検索
     */
    search() {
        let limit = (this.req.query.limit) ? this.req.query.limit : 10;
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let tel = (this.req.query.tel) ? this.req.query.tel : null;
        let purchaser_name = (this.req.query.purchaser_name) ? this.req.query.purchaser_name : null;
        // 検索条件を作成
        let conditions = [];
        conditions.push({
            purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR,
            sponsor: this.req.sponsorUser.get('_id'),
            status: ReservationUtil_1.default.STATUS_RESERVED
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
                .exec((err, reservationDocuments) => {
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
                        // conditions: conditions,
                        results: reservationDocuments,
                        count: count
                    });
                }
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorMyPageController;
