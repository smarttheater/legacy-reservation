"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const chevre_domain_3 = require("@motionpicture/chevre-domain");
const Util = require("../../../../common/Util/Util");
const BaseController_1 = require("../../BaseController");
const DEFAULT_RADIX = 10;
/**
 * 内部関係者マイページコントローラー
 *
 * @export
 * @class StaffMyPageController
 * @extends {BaseController}
 */
class StaffMyPageController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/staff/layout';
    }
    index() {
        chevre_domain_3.Models.Theater.find({}, 'name', { sort: { _id: 1 } }, (findTheaterErr, theaters) => {
            if (findTheaterErr)
                return this.next(findTheaterErr);
            chevre_domain_3.Models.Film.find({}, 'name', { sort: { _id: 1 } }, (findFilmErr, films) => {
                if (findFilmErr)
                    return this.next(findFilmErr);
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
    // tslint:disable-next-line:max-func-body-length
    search() {
        if (!this.req.staffUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        // tslint:disable-next-line:no-magic-numbers
        const limit = (this.req.query.limit) ? parseInt(this.req.query.limit, DEFAULT_RADIX) : 10;
        const page = (this.req.query.page) ? parseInt(this.req.query.page, DEFAULT_RADIX) : 1;
        const day = (this.req.query.day) ? this.req.query.day : null;
        const startTime = (this.req.query.start_time) ? this.req.query.start_time : null;
        const theater = (this.req.query.theater) ? this.req.query.theater : null;
        const film = (this.req.query.film) ? this.req.query.film : null;
        const updater = (this.req.query.updater) ? this.req.query.updater : null;
        let paymentNo = (this.req.query.payment_no) ? this.req.query.payment_no : null;
        // 検索条件を作成
        const conditions = [];
        // 管理者の場合、内部関係者の予約全て&確保中
        if (this.req.staffUser.get('is_admin')) {
            conditions.push({
                $or: [
                    {
                        purchaser_group: chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF,
                        status: chevre_domain_1.ReservationUtil.STATUS_RESERVED
                    },
                    {
                        status: chevre_domain_1.ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    }
                ]
            });
        }
        else {
            conditions.push({
                purchaser_group: chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF,
                staff: this.req.staffUser.get('_id'),
                status: chevre_domain_1.ReservationUtil.STATUS_RESERVED
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
                    $gte: startTime
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
            paymentNo = Util.toHalfWidth(paymentNo.replace(/\s/g, ''));
            conditions.push({ payment_no: { $regex: `${paymentNo}` } });
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
    /**
     * 配布先を更新する
     */
    updateWatcherName() {
        if (!this.req.staffUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const reservationId = this.req.body.reservationId;
        const watcherName = this.req.body.watcherName;
        const condition = {
            _id: reservationId,
            status: chevre_domain_1.ReservationUtil.STATUS_RESERVED
        };
        // 管理者でない場合は自分の予約のみ
        if (!this.req.staffUser.get('is_admin')) {
            condition.staff = this.req.staffUser.get('_id');
        }
        chevre_domain_3.Models.Reservation.findOneAndUpdate(condition, {
            watcher_name: watcherName,
            watcher_name_updated_at: Date.now(),
            staff_signature: this.req.staffUser.get('signature')
        }, {
            new: true
        }, (err, reservation) => {
            if (err) {
                this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError'),
                    reservationId: null
                });
            }
            else {
                if (!reservation) {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.NotFound'),
                        reservationId: null
                    });
                }
                else {
                    this.res.json({
                        success: true,
                        reservation: reservation.toObject()
                    });
                }
            }
        });
    }
    /**
     * 座席開放
     */
    release() {
        if (this.req.method === 'POST') {
            const day = this.req.body.day;
            if (!day) {
                this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError')
                });
                return;
            }
            chevre_domain_3.Models.Reservation.remove({
                performance_day: day,
                status: chevre_domain_1.ReservationUtil.STATUS_KEPT_BY_CHEVRE
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
            chevre_domain_3.Models.Reservation.find({
                status: chevre_domain_1.ReservationUtil.STATUS_KEPT_BY_CHEVRE
            }, 'status seat_code performance_day', (err, reservations) => {
                if (err)
                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                // 日付ごとに
                const reservationsByDay = {};
                for (const reservation of reservations) {
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
exports.default = StaffMyPageController;
