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
const conf = require("config");
const moment = require("moment");
const _ = require("underscore");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const session_1 = require("../../../models/reserve/session");
const ReserveBaseController_1 = require("../../ReserveBaseController");
/**
 * 内部関係者座席予約コントローラー
 *
 * @export
 * @class StaffReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
class StaffReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF;
        this.layout = 'layouts/staff/layout';
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            // 期限指定
            if (moment() < moment(conf.get('datetimes.reservation_start_staffs'))) {
                this.next(new Error(this.req.__('Message.OutOfTerm')));
                return;
            }
            try {
                const reservationModel = yield this.processStart();
                yield reservationModel.save();
                if (reservationModel.performance !== undefined) {
                    const cb = `/staff/reserve/${reservationModel.token}/seats`;
                    this.res.redirect(`/staff/reserve/${reservationModel.token}/terms?cb=${encodeURIComponent(cb)}`);
                }
                else {
                    const cb = `/staff/reserve/${reservationModel.token}/performances`;
                    this.res.redirect(`/staff/reserve/${reservationModel.token}/terms?cb=${encodeURIComponent(cb)}`);
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 規約(スキップ)
     */
    terms() {
        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }
    /**
     * スケジュール選択
     * @method performances
     * @returns {Promise<void>}
     */
    performances() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                let reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    reservePerformanceForm_1.default(this.req);
                    const validationResult = yield this.req.getValidationResult();
                    if (!validationResult.isEmpty()) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                        return;
                    }
                    try {
                        // パフォーマンスFIX
                        reservationModel = yield this.processFixPerformance(reservationModel, this.req.body.performanceId);
                        yield reservationModel.save();
                        this.res.redirect(`/staff/reserve/${token}/seats`);
                        return;
                    }
                    catch (error) {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                        return;
                    }
                }
                else {
                    // 仮予約あればキャンセルする
                    reservationModel = yield this.processCancelSeats(reservationModel);
                    yield reservationModel.save();
                    this.res.render('staff/reserve/performances', {
                        FilmUtil: chevre_domain_1.FilmUtil,
                        layout: this.layout
                    });
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 座席選択
     */
    seats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                let reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                const limit = reservationModel.getSeatsLimit();
                if (this.req.method === 'POST') {
                    reserveSeatForm_1.default(this.req);
                    const validationResult = yield this.req.getValidationResult();
                    if (!validationResult.isEmpty()) {
                        this.res.redirect(`/staff/reserve/${token}/seats`);
                        return;
                    }
                    reservationModel = reservationModel;
                    const seatCodes = JSON.parse(this.req.body.seatCodes);
                    // 追加指定席を合わせて制限枚数を超過した場合
                    if (seatCodes.length > limit) {
                        const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                        this.res.redirect(`/staff/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
                        return;
                    }
                    // 仮予約あればキャンセルする
                    try {
                        reservationModel = yield this.processCancelSeats(reservationModel);
                    }
                    catch (error) {
                        this.next(error);
                        return;
                    }
                    try {
                        // 座席FIX
                        reservationModel = yield this.processFixSeats(reservationModel, seatCodes);
                        yield reservationModel.save();
                        // 券種選択へ
                        this.res.redirect(`/staff/reserve/${token}/tickets`);
                        return;
                    }
                    catch (error) {
                        yield reservationModel.save();
                        const message = this.req.__('Message.SelectedSeatsUnavailable');
                        this.res.redirect(`/staff/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
                        return;
                    }
                }
                else {
                    this.res.render('staff/reserve/seats', {
                        reservationModel: reservationModel,
                        limit: limit,
                        layout: this.layout
                    });
                    return;
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
        });
    }
    /**
     * 券種選択
     */
    tickets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                let reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    try {
                        reservationModel = yield this.processFixTickets(reservationModel);
                        yield reservationModel.save();
                        this.res.redirect(`/staff/reserve/${token}/profile`);
                    }
                    catch (error) {
                        this.res.redirect(`/staff/reserve/${token}/tickets`);
                    }
                }
                else {
                    this.res.render('staff/reserve/tickets', {
                        reservationModel: reservationModel,
                        layout: this.layout
                    });
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 購入者情報(スキップ)
     */
    profile() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                const reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                yield this.processAllExceptConfirm(reservationModel);
                this.res.redirect(`/staff/reserve/${token}/confirm`);
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 予約内容確認
     */
    confirm() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                const reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    try {
                        yield this.processConfirm(reservationModel);
                        // 予約確定
                        yield this.processFixReservations(reservationModel.performance.day, reservationModel.paymentNo, {});
                        yield reservationModel.remove();
                        this.res.redirect(`/staff/reserve/${reservationModel.performance.day}/${reservationModel.paymentNo}/complete`);
                    }
                    catch (error) {
                        yield reservationModel.remove();
                        this.next(error);
                    }
                }
                else {
                    this.res.render('staff/reserve/confirm', {
                        reservationModel: reservationModel,
                        layout: this.layout
                    });
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    complete() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.staffUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            try {
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    performance_day: this.req.params.performanceDay,
                    payment_no: this.req.params.paymentNo,
                    status: chevre_domain_1.ReservationUtil.STATUS_RESERVED,
                    staff: this.req.staffUser.get('_id'),
                    purchased_at: {
                        $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
                    }
                }).exec();
                if (reservations.length === 0) {
                    this.next(new Error(this.req.__('Message.NotFound')));
                    return;
                }
                reservations.sort((a, b) => {
                    return chevre_domain_1.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });
                this.res.render('staff/reserve/complete', {
                    reservationDocuments: reservations,
                    layout: this.layout
                });
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 予約フロー中の座席をキャンセルするプロセス
     *
     * @override
     */
    // tslint:disable-next-line:prefer-function-over-method
    processCancelSeats(reservationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            const seatCodesInSession = (reservationModel.seatCodes !== undefined) ? reservationModel.seatCodes : [];
            if (seatCodesInSession.length === 0) {
                return reservationModel;
            }
            // セッション中の予約リストを初期化
            reservationModel.seatCodes = [];
            // 仮予約をCHEVRE確保ステータスに戻す
            try {
                yield chevre_domain_1.Models.Reservation.update({
                    performance: reservationModel.performance._id,
                    seat_code: { $in: seatCodesInSession },
                    status: chevre_domain_1.ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE
                }, {
                    $set: {
                        status: chevre_domain_1.ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    },
                    $unset: {
                        staff: ''
                    }
                }, {
                    multi: true
                }).exec();
                // 仮予約を空席ステータスに戻す
                yield chevre_domain_1.Models.Reservation.remove({
                    performance: reservationModel.performance._id,
                    seat_code: { $in: seatCodesInSession },
                    status: chevre_domain_1.ReservationUtil.STATUS_TEMPORARY
                }).exec();
            }
            catch (error) {
                // 失敗したとしても時間経過で消えるので放置
            }
            return reservationModel;
        });
    }
    /**
     * 座席をFIXするプロセス
     *
     * @override
     */
    processFixSeats(reservationModel, seatCodes) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.staffUser === undefined) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }
            const staffUser = this.req.staffUser;
            // セッション中の予約リストを初期化
            reservationModel.seatCodes = [];
            reservationModel.expiredAt = moment().add(conf.get('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();
            // 新たな座席指定と、既に仮予約済みの座席コードについて
            const promises = seatCodes.map((seatCode) => __awaiter(this, void 0, void 0, function* () {
                const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                    return (seat.code === seatCode);
                });
                // 万が一、座席が存在しなかったら
                if (seatInfo === undefined) {
                    throw new Error(this.req.__('Message.InvalidSeatCode'));
                }
                // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
                try {
                    const reservation = yield chevre_domain_1.Models.Reservation.create({
                        performance: reservationModel.performance._id,
                        seat_code: seatCode,
                        status: chevre_domain_1.ReservationUtil.STATUS_TEMPORARY,
                        expired_at: reservationModel.expiredAt,
                        staff: staffUser.get('_id')
                    });
                    // ステータス更新に成功したらセッションに保管
                    reservationModel.seatCodes.push(seatCode);
                    reservationModel.setReservation(seatCode, {
                        _id: reservation.get('_id'),
                        status: reservation.get('status'),
                        seat_code: reservation.get('seat_code'),
                        seat_grade_name: seatInfo.grade.name,
                        seat_grade_additional_charge: seatInfo.grade.additional_charge,
                        ticket_type: '',
                        ticket_type_name: {
                            ja: '',
                            en: ''
                        },
                        ticket_type_charge: 0,
                        watcher_name: ''
                    });
                }
                catch (error) {
                    // CHEVRE確保からの仮予約を試みる
                    const reservation = yield chevre_domain_1.Models.Reservation.findOneAndUpdate({
                        performance: reservationModel.performance._id,
                        seat_code: seatCode,
                        status: chevre_domain_1.ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    }, {
                        status: chevre_domain_1.ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE,
                        expired_at: reservationModel.expiredAt,
                        staff: staffUser.get('_id')
                    }, {
                        new: true
                    }).exec();
                    if (reservation === null) {
                        throw new Error(this.req.__('Message.UnexpectedError'));
                    }
                    // ステータス更新に成功したらセッションに保管
                    reservationModel.seatCodes.push(seatCode);
                    reservationModel.setReservation(seatCode, {
                        _id: reservation.get('_id'),
                        status: reservation.get('status'),
                        seat_code: reservation.get('seat_code'),
                        seat_grade_name: seatInfo.grade.name,
                        seat_grade_additional_charge: seatInfo.grade.additional_charge,
                        ticket_type: '',
                        ticket_type_name: {
                            ja: '',
                            en: ''
                        },
                        ticket_type_charge: 0,
                        watcher_name: ''
                    });
                }
            }));
            yield Promise.all(promises);
            // 座席コードのソート(文字列順に)
            reservationModel.seatCodes.sort(chevre_domain_1.ScreenUtil.sortBySeatCode);
            return reservationModel;
        });
    }
}
exports.default = StaffReserveController;
