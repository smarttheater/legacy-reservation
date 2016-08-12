"use strict";
const BaseController_1 = require('../../BaseController');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const Models_1 = require('../../../../common/models/Models');
class StaffMyPageController extends BaseController_1.default {
    index() {
        Models_1.default.Theater.find({}, '_id name name_en', (err, theaterDocuments) => {
            Models_1.default.Film.find({}, '_id name name_en', (err, filmDocuments) => {
                this.res.render('staff/mypage/index', {
                    layout: 'layouts/staff/layout',
                    theaters: theaterDocuments,
                    films: filmDocuments
                });
            });
        });
    }
    /**
     * マイページ予約検索
     */
    search() {
        let limit = 2;
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let day = (this.req.query.day) ? this.req.query.day : null;
        let startTime = (this.req.query.start_time) ? this.req.query.start_time : null;
        let theater = (this.req.query.theater) ? this.req.query.theater : null;
        let film = (this.req.query.film) ? this.req.query.film : null;
        let updater = (this.req.query.updater) ? this.req.query.updater : null;
        // 検索条件を作成
        let conditions = [];
        conditions.push({
            purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_STAFF,
            staff: this.staffUser.get('_id'),
            status: ReservationUtil_1.default.STATUS_RESERVED
        });
        if (film) {
            conditions.push({ film: film });
        }
        if (theater) {
            conditions.push({ theater: theater });
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
        if (updater) {
            conditions.push({
                $or: [
                    {
                        staff_signature: { $regex: `${updater}` }
                    },
                    {
                        watcher_name: { $regex: `${updater}` }
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
                    isSuccess: false,
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
                        isSuccess: false,
                        results: [],
                        count: 0
                    });
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
    /**
     * 配布先を更新する
     */
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
            watcher_name_updated_at: Date.now(),
            staff_signature: this.staffUser.get('signature'),
        }, {
            new: true
        }, (err, reservationDocument) => {
            this.logger.debug('updated watcher_name. reservationDocument:', reservationDocument);
            if (err) {
                return this.res.json({
                    isSuccess: false,
                    message: this.req.__('message.UnexpectedError'),
                    reservationId: null
                });
            }
            if (!reservationDocument) {
                this.res.json({
                    isSuccess: false,
                    message: this.req.__('message.NotFound'),
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
