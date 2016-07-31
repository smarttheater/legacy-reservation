"use strict";
const BaseController_1 = require('../../BaseController');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const Models_1 = require('../../../../common/models/Models');
class StaffMyPageController extends BaseController_1.default {
    index() {
        this.res.render('staff/mypage/index', {
            layout: 'layouts/staff/layout',
        });
    }
    /**
     * マイページ予約検索API
     */
    search() {
        let limit = 2;
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let day = (this.req.query.day) ? this.req.query.day : null;
        let startTime = (this.req.query.start_time) ? this.req.query.start_time : null;
        let film = (this.req.query.film) ? this.req.query.film : null;
        let words = (this.req.query.words) ? this.req.query.words : null;
        // 検索条件を作成
        let conditions = [];
        conditions.push({ staff: this.staffUser.get('_id') });
        conditions.push({ status: ReservationUtil_1.default.STATUS_RESERVED });
        if (film) {
            conditions.push({ film: film });
        }
        if (day) {
            conditions.push({ performance_day: day });
        }
        if (startTime) {
            conditions.push({
                performance_start_time: {
                    $gte: startTime,
                }
            });
        }
        if (words) {
            conditions.push({
                $or: [
                    {
                        film_name: { $regex: `${words}` }
                    },
                    {
                        staff_signature: { $regex: `${words}` }
                    },
                    {
                        watcher_name: { $regex: `${words}` }
                    }
                ]
            });
        }
        // 総数検索
        Models_1.default.Reservation.count({
            $and: conditions
        }, (err, count) => {
            Models_1.default.Reservation.find({
                $and: conditions
            }, {}, {
                sort: { staff: 1, seat_code: 1 }
            })
                .skip(limit * (page - 1))
                .limit(limit)
                .populate('staff screen')
                .exec((err, reservationDocuments) => {
                if (err) {
                }
                else {
                    conditions['page'] = page;
                    this.res.json({
                        isSuccess: true,
                        // conditions: conditions,
                        results: reservationDocuments,
                        count: count
                    });
                }
            });
        });
    }
    updateWatcherName() {
        let reservationId = this.req.body.reservationId;
        let watcherName = this.req.body.watcherName;
        this.logger.debug('updating watcher_name... id:', reservationId);
        Models_1.default.Reservation.findOneAndUpdate({
            staff: this.staffUser.get('_id'),
            status: ReservationUtil_1.default.STATUS_RESERVED,
            _id: reservationId,
        }, {
            watcher_name: watcherName,
            staff_signature: this.staffUser.get('signature'),
        }, {
            new: true
        }, (err, reservationDocument) => {
            this.logger.debug('updated watcher_name. reservationDocument:', reservationDocument);
            if (err || reservationDocument === null) {
                this.res.json({
                    isSuccess: false,
                    reservationId: null
                });
            }
            else {
                this.res.json({
                    isSuccess: true,
                    reservation: reservationDocument.toObject()
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffMyPageController;
