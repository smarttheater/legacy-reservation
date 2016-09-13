"use strict";
const BaseController_1 = require("../../BaseController");
const Util_1 = require("../../../../common/Util/Util");
const ReservationUtil_1 = require("../../../../common/models/Reservation/ReservationUtil");
const Models_1 = require("../../../../common/models/Models");
class StaffMyPageController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/staff/layout';
    }
    index() {
        Models_1.default.Theater.find({}, 'name', (err, theaters) => {
            Models_1.default.Film.find({}, 'name', (err, films) => {
                this.res.render('staff/mypage/index', {
                    theaters: theaters,
                    films: films
                });
            });
        });
    }
    /**
     * マイページ予約検索
     */
    search() {
        let limit = (this.req.query.limit) ? this.req.query.limit : 10;
        let page = (this.req.query.page) ? this.req.query.page : 1;
        let day = (this.req.query.day) ? this.req.query.day : null;
        let startTime = (this.req.query.start_time) ? this.req.query.start_time : null;
        let theater = (this.req.query.theater) ? this.req.query.theater : null;
        let film = (this.req.query.film) ? this.req.query.film : null;
        let updater = (this.req.query.updater) ? this.req.query.updater : null;
        let paymentNo = (this.req.query.payment_no) ? this.req.query.payment_no : null;
        // 検索条件を作成
        let conditions = [];
        // 管理者の場合、内部関係者の予約全て&確保中
        if (this.req.staffUser.get('is_admin')) {
            conditions.push({
                $or: [
                    {
                        purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_STAFF,
                        status: ReservationUtil_1.default.STATUS_RESERVED
                    },
                    {
                        status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
                    }
                ]
            });
        }
        else {
            conditions.push({
                purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_STAFF,
                staff: this.req.staffUser.get('_id'),
                status: ReservationUtil_1.default.STATUS_RESERVED
            });
        }
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
    /**
     * 配布先を更新する
     */
    updateWatcherName() {
        let reservationId = this.req.body.reservationId;
        let watcherName = this.req.body.watcherName;
        let condition = {
            _id: reservationId,
            status: ReservationUtil_1.default.STATUS_RESERVED
        };
        // 管理者でない場合は自分の予約のみ
        if (!this.req.staffUser.get('is_admin')) {
            condition['staff'] = this.req.staffUser.get('_id');
        }
        Models_1.default.Reservation.findOneAndUpdate(condition, {
            watcher_name: watcherName,
            watcher_name_updated_at: Date.now(),
            staff_signature: this.req.staffUser.get('signature'),
        }, {
            new: true
        }, (err, reservation) => {
            if (err) {
                return this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError'),
                    reservationId: null
                });
            }
            if (!reservation) {
                return this.res.json({
                    success: false,
                    message: this.req.__('Message.NotFound'),
                    reservationId: null
                });
            }
            this.res.json({
                success: true,
                reservation: reservation.toObject()
            });
        });
    }
    /**
     * 座席開放
     */
    release() {
        if (this.req.method === 'POST') {
            let day = this.req.body.day;
            if (!day) {
                this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError')
                });
                return;
            }
            Models_1.default.Reservation.remove({
                performance_day: day,
                status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
            }, (err) => {
                if (err) {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                }
                else {
                    this.res.json({
                        success: true,
                        message: null
                    });
                }
            });
        }
        else {
            // 開放座席情報取得
            Models_1.default.Reservation.find({
                status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
            }, 'status seat_code performance_day', (err, reservations) => {
                if (err)
                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                // 日付ごとに
                let reservationsByDay = {};
                for (let reservation of reservations) {
                    if (!reservationsByDay.hasOwnProperty(reservation.get('performance_day'))) {
                        reservationsByDay[reservation.get('performance_day')] = [];
                    }
                    reservationsByDay[reservation.get('performance_day')].push(reservation);
                }
                this.res.render('staff/mypage/release', {
                    reservationsByDay: reservationsByDay
                });
            });
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffMyPageController;
