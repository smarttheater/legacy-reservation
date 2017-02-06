"use strict";
const ReserveBaseController_1 = require("../../ReserveBaseController");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const ttts_domain_3 = require("@motionpicture/ttts-domain");
const ttts_domain_4 = require("@motionpicture/ttts-domain");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const moment = require("moment");
const conf = require("config");
class StaffReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = ttts_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF;
        this.layout = 'layouts/staff/layout';
    }
    start() {
        // 期限指定
        if (moment() < moment(conf.get('datetimes.reservation_start_staffs'))) {
            return this.next(new Error(this.req.__('Message.OutOfTerm')));
        }
        this.processStart((err, reservationModel) => {
            if (err)
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationModel.performance) {
                reservationModel.save(() => {
                    let cb = this.router.build('staff.reserve.seats', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('staff.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            }
            else {
                reservationModel.save(() => {
                    let cb = this.router.build('staff.reserve.performances', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('staff.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            }
        });
    }
    /**
     * 規約(スキップ)
     */
    terms() {
        let cb = (this.req.query.cb) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }
    /**
     * 予約フロー中の座席をキャンセルするプロセス
     *
     * @override
     */
    processCancelSeats(reservationModel, cb) {
        let seatCodesInSession = (reservationModel.seatCodes) ? reservationModel.seatCodes : [];
        if (seatCodesInSession.length === 0)
            return cb(null, reservationModel);
        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        // 仮予約をTTTS確保ステータスに戻す
        ttts_domain_1.Models.Reservation.update({
            performance: reservationModel.performance._id,
            seat_code: { $in: seatCodesInSession },
            status: ttts_domain_2.ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TTTS
        }, {
            $set: {
                status: ttts_domain_2.ReservationUtil.STATUS_KEPT_BY_TTTS
            },
            $unset: {
                staff: ''
            }
        }, {
            multi: true
        }, (err, raw) => {
            // 失敗したとしても時間経過で消えるので放置
            // 仮予約を空席ステータスに戻す
            ttts_domain_1.Models.Reservation.remove({
                performance: reservationModel.performance._id,
                seat_code: { $in: seatCodesInSession },
                status: ttts_domain_2.ReservationUtil.STATUS_TEMPORARY
            }, (err) => {
                // 失敗したとしても時間経過で消えるので放置
                cb(null, reservationModel);
            });
        });
    }
    /**
     * 座席をFIXするプロセス
     *
     * @override
     */
    processFixSeats(reservationModel, seatCodes, cb) {
        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        reservationModel.expiredAt = moment().add(conf.get('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();
        // 新たな座席指定と、既に仮予約済みの座席コードについて
        let promises = seatCodes.map((seatCode) => {
            return new Promise((resolve, reject) => {
                let seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                    return (seat.code === seatCode);
                });
                // 万が一、座席が存在しなかったら
                if (!seatInfo)
                    return reject(new Error(this.req.__('Message.InvalidSeatCode')));
                // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
                ttts_domain_1.Models.Reservation.create({
                    performance: reservationModel.performance._id,
                    seat_code: seatCode,
                    status: ttts_domain_2.ReservationUtil.STATUS_TEMPORARY,
                    expired_at: reservationModel.expiredAt,
                    staff: this.req.staffUser.get('_id')
                }, (err, reservation) => {
                    if (err) {
                        // TTTS確保からの仮予約を試みる
                        ttts_domain_1.Models.Reservation.findOneAndUpdate({
                            performance: reservationModel.performance._id,
                            seat_code: seatCode,
                            status: ttts_domain_2.ReservationUtil.STATUS_KEPT_BY_TTTS
                        }, {
                            status: ttts_domain_2.ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TTTS,
                            expired_at: reservationModel.expiredAt,
                            staff: this.req.staffUser.get('_id')
                        }, {
                            new: true
                        }, (err, reservation) => {
                            if (err)
                                return reject(err);
                            if (!reservation)
                                return reject(new Error(this.req.__('Message.UnexpectedError')));
                            // ステータス更新に成功したらセッションに保管
                            reservationModel.seatCodes.push(seatCode);
                            reservationModel.setReservation(seatCode, {
                                _id: reservation.get('_id'),
                                status: reservation.get('status'),
                                seat_code: reservation.get('seat_code'),
                                seat_grade_name_ja: seatInfo.grade.name.ja,
                                seat_grade_name_en: seatInfo.grade.name.en,
                                seat_grade_additional_charge: seatInfo.grade.additional_charge,
                                ticket_type_code: null,
                                ticket_type_name_ja: null,
                                ticket_type_name_en: null,
                                ticket_type_charge: 0,
                                watcher_name: null
                            });
                            resolve();
                        });
                    }
                    else {
                        // ステータス更新に成功したらセッションに保管
                        reservationModel.seatCodes.push(seatCode);
                        reservationModel.setReservation(seatCode, {
                            _id: reservation.get('_id'),
                            status: reservation.get('status'),
                            seat_code: reservation.get('seat_code'),
                            seat_grade_name_ja: seatInfo.grade.name.ja,
                            seat_grade_name_en: seatInfo.grade.name.en,
                            seat_grade_additional_charge: seatInfo.grade.additional_charge,
                            ticket_type_code: null,
                            ticket_type_name_ja: null,
                            ticket_type_name_en: null,
                            ticket_type_charge: 0,
                            watcher_name: null
                        });
                        resolve();
                    }
                });
            });
        });
        Promise.all(promises).then(() => {
            // 座席コードのソート(文字列順に)
            reservationModel.seatCodes.sort(ttts_domain_3.ScreenUtil.sortBySeatCode);
            cb(null, reservationModel);
        }, (err) => {
            cb(err, reservationModel);
        });
    }
    /**
     * スケジュール選択
     */
    performances() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                reservePerformanceForm_1.default(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // パフォーマンスFIX
                        this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                            if (err) {
                                this.next(err);
                            }
                            else {
                                reservationModel.save(() => {
                                    this.res.redirect(this.router.build('staff.reserve.seats', { token: token }));
                                });
                            }
                        });
                    }
                    else {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                });
            }
            else {
                // 仮予約あればキャンセルする
                this.processCancelSeats(reservationModel, (err, reservationModel) => {
                    reservationModel.save(() => {
                        this.res.render('staff/reserve/performances', {
                            FilmUtil: ttts_domain_4.FilmUtil
                        });
                    });
                });
            }
        });
    }
    /**
     * 座席選択
     */
    seats() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            let limit = reservationModel.getSeatsLimit();
            if (this.req.method === 'POST') {
                reserveSeatForm_1.default(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        let seatCodes = JSON.parse(this.req.form['seatCodes']);
                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            let message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                            this.res.redirect(`${this.router.build('staff.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                        }
                        else {
                            // 仮予約あればキャンセルする
                            this.processCancelSeats(reservationModel, (err, reservationModel) => {
                                // 座席FIX
                                this.processFixSeats(reservationModel, seatCodes, (err, reservationModel) => {
                                    if (err) {
                                        reservationModel.save(() => {
                                            let message = this.req.__('Message.SelectedSeatsUnavailable');
                                            this.res.redirect(`${this.router.build('staff.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
                                    }
                                    else {
                                        reservationModel.save(() => {
                                            // 券種選択へ
                                            this.res.redirect(this.router.build('staff.reserve.tickets', { token: token }));
                                        });
                                    }
                                });
                            });
                        }
                    }
                    else {
                        this.res.redirect(this.router.build('staff.reserve.seats', { token: token }));
                    }
                });
            }
            else {
                this.res.render('staff/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit
                });
            }
        });
    }
    /**
     * 券種選択
     */
    tickets() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                this.processFixTickets(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.redirect(this.router.build('staff.reserve.tickets', { token: token }));
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('staff.reserve.profile', { token: token }));
                        });
                    }
                });
            }
            else {
                this.res.render('staff/reserve/tickets', {
                    reservationModel: reservationModel,
                });
            }
        });
    }
    /**
     * 購入者情報(スキップ)
     */
    profile() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            this.res.redirect(this.router.build('staff.reserve.confirm', { token: token }));
        });
    }
    /**
     * 予約内容確認
     */
    confirm() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                this.processConfirm(reservationModel, (err, reservationModel) => {
                    if (err) {
                        reservationModel.remove(() => {
                            this.next(err);
                        });
                    }
                    else {
                        // 予約確定
                        this.processFixReservations(reservationModel.paymentNo, {}, (err) => {
                            if (err) {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('staff.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            }
                            else {
                                reservationModel.remove(() => {
                                    this.logger.info('redirecting to complete...');
                                    this.res.redirect(this.router.build('staff.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                                });
                            }
                        });
                    }
                });
            }
            else {
                this.res.render('staff/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    complete() {
        let paymentNo = this.req.params.paymentNo;
        ttts_domain_1.Models.Reservation.find({
            payment_no: paymentNo,
            status: ttts_domain_2.ReservationUtil.STATUS_RESERVED,
            staff: this.req.staffUser.get('_id'),
            purchased_at: {
                $gt: moment().add(-30, 'minutes').toISOString()
            }
        }, (err, reservations) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            reservations.sort((a, b) => {
                return ttts_domain_3.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });
            this.res.render('staff/reserve/complete', {
                reservationDocuments: reservations
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffReserveController;
