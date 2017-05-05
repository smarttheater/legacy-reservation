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
const base_1 = require("../base");
const DEFAULT_RADIX = 10;
/**
 * 内部関係者マイページコントローラー
 *
 * @export
 * @class StaffMyPageController
 * @extends {BaseController}
 */
class StaffMyPageController extends base_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/staff/layout';
    }
    index() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const theaters = yield chevre_domain_1.Models.Theater.find({}, 'name', { sort: { _id: 1 } }).exec();
                const films = yield chevre_domain_1.Models.Film.find({}, 'name', { sort: { _id: 1 } }).exec();
                this.res.render('staff/mypage/index', {
                    theaters: theaters,
                    films: films,
                    layout: this.layout
                });
            }
            catch (error) {
                this.next(error);
            }
        });
    }
    /**
     * マイページ予約検索
     */
    // tslint:disable-next-line:max-func-body-length cyclomatic-complexity
    search() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.staffUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            // tslint:disable-next-line:no-magic-numbers
            const limit = (!_.isEmpty(this.req.query.limit)) ? parseInt(this.req.query.limit, DEFAULT_RADIX) : 10;
            const page = (!_.isEmpty(this.req.query.page)) ? parseInt(this.req.query.page, DEFAULT_RADIX) : 1;
            const day = (!_.isEmpty(this.req.query.day)) ? this.req.query.day : null;
            const startTime = (!_.isEmpty(this.req.query.start_time)) ? this.req.query.start_time : null;
            const theater = (!_.isEmpty(this.req.query.theater)) ? this.req.query.theater : null;
            const film = (!_.isEmpty(this.req.query.film)) ? this.req.query.film : null;
            const updater = (!_.isEmpty(this.req.query.updater)) ? this.req.query.updater : null;
            let paymentNo = (!_.isEmpty(this.req.query.payment_no)) ? this.req.query.payment_no : null;
            // 検索条件を作成
            const conditions = [];
            // 管理者の場合、内部関係者の予約全て&確保中
            if (this.req.staffUser.get('is_admin') === true) {
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
            if (film !== null) {
                conditions.push({ film: film });
            }
            if (theater !== null) {
                conditions.push({ theater: theater });
            }
            if (day !== null) {
                conditions.push({ performance_day: day });
            }
            if (startTime !== null) {
                conditions.push({
                    performance_start_time: {
                        $gte: startTime
                    }
                });
            }
            if (updater !== null) {
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
            if (paymentNo !== null) {
                // remove space characters
                paymentNo = chevre_domain_1.CommonUtil.toHalfWidth(paymentNo.replace(/\s/g, ''));
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
                    if (a.performance_day > b.performance_day) {
                        return 1;
                    }
                    if (a.performance_start_time > b.performance_start_time) {
                        return 1;
                    }
                    if (a.screen > b.screen) {
                        return 1;
                    }
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
    /**
     * 配布先を更新する
     */
    updateWatcherName() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.staffUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            const reservationId = this.req.body.reservationId;
            const watcherName = this.req.body.watcherName;
            const condition = {
                _id: reservationId,
                status: chevre_domain_1.ReservationUtil.STATUS_RESERVED
            };
            // 管理者でない場合は自分の予約のみ
            if (this.req.staffUser.get('is_admin') !== true) {
                condition.staff = this.req.staffUser.get('_id');
            }
            try {
                const reservation = yield chevre_domain_1.Models.Reservation.findOneAndUpdate(condition, {
                    watcher_name: watcherName,
                    watcher_name_updated_at: Date.now(),
                    staff_signature: this.req.staffUser.get('signature')
                }, { new: true }).exec();
                if (reservation === null) {
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
            catch (error) {
                this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError'),
                    reservationId: null
                });
            }
        });
    }
    /**
     * 座席開放
     */
    release() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.method === 'POST') {
                const day = this.req.body.day;
                if (day === undefined || day === '') {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                    return;
                }
                try {
                    yield chevre_domain_1.Models.Reservation.remove({
                        performance_day: day,
                        status: chevre_domain_1.ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    }).exec();
                    this.res.json({
                        success: true,
                        message: null
                    });
                }
                catch (error) {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                }
            }
            else {
                try {
                    // 開放座席情報取得
                    const reservations = yield chevre_domain_1.Models.Reservation.find({
                        status: chevre_domain_1.ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    }, 'status seat_code performance_day').exec();
                    // 日付ごとに
                    const reservationsByDay = {};
                    reservations.forEach((reservation) => {
                        if (!reservationsByDay.hasOwnProperty(reservation.get('performance_day'))) {
                            reservationsByDay[reservation.get('performance_day')] = [];
                        }
                        reservationsByDay[reservation.get('performance_day')].push(reservation);
                    });
                    this.res.render('staff/mypage/release', {
                        reservationsByDay: reservationsByDay,
                        layout: this.layout
                    });
                }
                catch (error) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                }
            }
        });
    }
}
exports.default = StaffMyPageController;
