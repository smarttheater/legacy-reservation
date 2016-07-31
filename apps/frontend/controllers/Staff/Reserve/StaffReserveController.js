"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const Util_1 = require('../../../../common/Util/Util');
const reservePerformanceForm_1 = require('../../../forms/Reserve/reservePerformanceForm');
const reserveSeatForm_1 = require('../../../forms/Reserve/reserveSeatForm');
const reserveTicketForm_1 = require('../../../forms/Reserve/reserveTicketForm');
const Models_1 = require('../../../../common/models/Models');
const FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
const ReservationResultModel_1 = require('../../../models/Reserve/ReservationResultModel');
class StaffReserveController extends ReserveBaseController_1.default {
    start() {
        // 予約トークンを発行
        let token = Util_1.default.createToken();
        let reservationModel = new ReservationModel_1.default();
        reservationModel.token = token;
        reservationModel.staff = {
            _id: this.staffUser.get('_id'),
            user_id: this.staffUser.get('user_id'),
            name: this.staffUser.get('name'),
            email: this.staffUser.get('email'),
            department_name: this.staffUser.get('department_name'),
            tel: this.staffUser.get('tel'),
            signature: this.staffUser.get('signature'),
        };
        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save((err) => {
            this.res.redirect(this.router.build('staff.reserve.performances', { token: token }));
        });
    }
    /**
     * スケジュール選択
     */
    performances() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
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
                        this.next(new Error('不適切なアクセスです'));
                    }
                });
            }
            else {
                // 仮予約あればキャンセルする
                this.processCancelSeats(reservationModel, (err, reservationModel) => {
                    this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save((err) => {
                        this.res.render('staff/reserve/performances', {
                            layout: 'layouts/staff/layout',
                            FilmUtil: FilmUtil_1.default
                        });
                    });
                });
            }
        });
    }
    /**
     * 座席選択
     *
     * TODO 1パフォーマンスにつき何件まで？？？
     */
    seats() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
            this.logger.debug('reservationModel is ', reservationModel.toLog());
            // 外部関係者による予約数を取得
            Models_1.default.Reservation.count({
                staff: this.staffUser.get('_id')
            }, (err, reservationsCount) => {
                if (this.req.method === 'POST') {
                    reserveSeatForm_1.default(this.req, this.res, (err) => {
                        if (this.req.form.isValid) {
                            let reservationIds = JSON.parse(this.req.form['reservationIds']);
                            // 座席FIX
                            this.processFixSeats(reservationModel, reservationIds, (err, reservationModel) => {
                                if (err) {
                                    this.next(err);
                                }
                                else {
                                    this.logger.debug('saving reservationModel... ', reservationModel);
                                    reservationModel.save((err) => {
                                        // 仮押さえできていない在庫があった場合
                                        if (reservationIds.length > reservationModel.reservationIds.length) {
                                            // TODO メッセージ？
                                            let message = '座席を確保できませんでした。再度指定してください。';
                                            this.res.redirect(this.router.build('staff.reserve.seats', { token: token }) + `?message=${encodeURIComponent(message)}`);
                                        }
                                        else {
                                            this.res.redirect(this.router.build('staff.reserve.tickets', { token: token }));
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            this.res.redirect(this.router.build('staff.reserve.seats', { token: token }));
                        }
                    });
                }
                else {
                    this.res.render('staff/reserve/seats', {
                        layout: 'layouts/staff/layout',
                        reservationModel: reservationModel,
                    });
                }
            });
        });
    }
    /**
     * 券種選択
     */
    tickets() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
            this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (this.req.method === 'POST') {
                reserveTicketForm_1.default(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(this.req.form['choices']);
                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                let reservation = reservationModel.getReservation(choice.reservation_id);
                                let ticketType = reservationModel.ticketTypes.find((ticketType) => {
                                    return (ticketType.code === choice.ticket_type_code);
                                });
                                if (!ticketType) {
                                    return this.next(new Error('不適切なアクセスです'));
                                }
                                reservation.ticket_type_code = ticketType.code;
                                reservation.ticket_type_name = ticketType.name;
                                reservation.ticket_type_name_en = ticketType.name_en;
                                reservation.ticket_type_charge = ticketType.charge;
                                ;
                                reservation.watcher_name = choice.watcher_name;
                                reservationModel.setReservation(reservation._id, reservation);
                            });
                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('staff.reserve.confirm', { token: token }));
                            });
                        }
                        else {
                            this.next(new Error('不適切なアクセスです'));
                        }
                    }
                    else {
                        this.res.redirect(this.router.build('staff.reserve.tickets', { token: token }));
                    }
                });
            }
            else {
                this.res.render('staff/reserve/tickets', {
                    layout: 'layouts/staff/layout',
                    reservationModel: reservationModel,
                });
            }
        });
    }
    /**
     * 予約内容確認
     */
    confirm() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
            this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (this.req.method === 'POST') {
                this.res.redirect(this.router.build('staff.reserve.process', { token: token }));
            }
            else {
                this.res.render('staff/reserve/confirm', {
                    layout: 'layouts/staff/layout',
                    reservationModel: reservationModel
                });
            }
        });
    }
    process() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
            this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (this.req.method === 'POST') {
            }
            else {
                // 予約情報セッション削除
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(() => {
                    if (err) {
                    }
                    else {
                        // ここで予約番号発行
                        reservationModel.paymentNo = Util_1.default.createPaymentNo();
                        // 予約プロセス固有のログファイルをセット
                        this.setProcessLogger(reservationModel.paymentNo, () => {
                            this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);
                            this.logger.info('fixing all...');
                            this.processFixAll(reservationModel, (err, reservationModel) => {
                                if (err) {
                                    // TODO 万が一の対応どうするか
                                    this.next(err);
                                }
                                else {
                                    // TODO 予約できていない在庫があった場合
                                    if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                        this.res.redirect(this.router.build('staff.reserve.confirm', { token: token }));
                                    }
                                    else {
                                        // 予約結果セッションを保存して、完了画面へ
                                        let reservationResultModel = reservationModel.toReservationResult();
                                        this.logger.info('saving reservationResult...', reservationResultModel.toLog());
                                        reservationResultModel.save((err) => {
                                            this.logger.info('redirecting to complete...');
                                            this.res.redirect(this.router.build('staff.reserve.complete', { token: token }));
                                        });
                                    }
                                }
                            });
                        });
                    }
                });
            }
        });
    }
    complete() {
        let token = this.req.params.token;
        ReservationResultModel_1.default.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
            this.res.render('staff/reserve/complete', {
                layout: 'layouts/staff/layout',
                reservationResultModel: reservationResultModel,
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffReserveController;
