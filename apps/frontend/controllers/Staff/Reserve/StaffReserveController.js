"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const reservePerformanceForm_1 = require('../../../forms/Reserve/reservePerformanceForm');
const reserveSeatForm_1 = require('../../../forms/Reserve/reserveSeatForm');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
class StaffReserveController extends ReserveBaseController_1.default {
    constructor(...args) {
        super(...args);
        this.purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_STAFF;
        this.layout = 'layouts/staff/layout';
    }
    start() {
        this.processStart((err, reservationModel) => {
            if (err)
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationModel.performance) {
                reservationModel.save((err) => {
                    let cb = this.router.build('staff.reserve.seats', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('staff.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            }
            else {
                reservationModel.save((err) => {
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
                                this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save((err) => {
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
                    this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save((err) => {
                        this.res.render('staff/reserve/performances', {
                            FilmUtil: FilmUtil_1.default
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
            let limit = StaffReserveController.RESERVATION_LIMIT_PER_PERFORMANCE;
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
                            this.logger.debug('processCancelSeats processing...');
                            this.processCancelSeats(reservationModel, (err, reservationModel) => {
                                this.logger.debug('processCancelSeats processed.', err);
                                // 座席FIX
                                this.processFixSeats(reservationModel, seatCodes, (err, reservationModel) => {
                                    if (err) {
                                        reservationModel.save((err) => {
                                            let message = this.req.__('Mesasge.SelectedSeatsUnavailable');
                                            this.res.redirect(`${this.router.build('staff.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
                                    }
                                    else {
                                        reservationModel.save((err) => {
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
                        reservationModel.save((err) => {
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
                        let message = err.message;
                        this.res.redirect(`${this.router.build('staff.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                    }
                    else {
                        // 予約確定
                        this.processFixReservations(reservationModel.paymentNo, {}, (err) => {
                            if (err) {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('staff.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            }
                            else {
                                reservationModel.remove((err) => {
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
        Models_1.default.Reservation.find({
            payment_no: paymentNo,
            status: ReservationUtil_1.default.STATUS_RESERVED,
            staff: this.req.staffUser.get('_id')
        }, null, {
            sort: {
                seat_code: 1
            }
        }, (err, reservationDocuments) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationDocuments.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            this.res.render('staff/reserve/complete', {
                reservationDocuments: reservationDocuments
            });
        });
    }
}
StaffReserveController.RESERVATION_LIMIT_PER_PERFORMANCE = 10; // パフォーマンスあたりの最大座席確保枚数
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffReserveController;
