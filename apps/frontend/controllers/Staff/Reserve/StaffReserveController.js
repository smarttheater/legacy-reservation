"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const Util_1 = require('../../../../common/Util/Util');
const reservePerformanceForm_1 = require('../../../forms/Reserve/reservePerformanceForm');
const reserveSeatForm_1 = require('../../../forms/Reserve/reserveSeatForm');
const reserveTicketForm_1 = require('../../../forms/Reserve/reserveTicketForm');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
class StaffReserveController extends ReserveBaseController_1.default {
    start() {
        // 予約トークンを発行
        let token = Util_1.default.createToken();
        let reservationModel = new ReservationModel_1.default();
        reservationModel.token = token;
        reservationModel.purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_STAFF;
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
     */
    seats() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
            let limit = 10;
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
                                        let message = err.message;
                                        this.res.redirect(`${this.router.build('staff.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                    }
                                    else {
                                        this.logger.debug('saving reservationModel... ', reservationModel);
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
                    layout: 'layouts/staff/layout',
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
                                let reservation = reservationModel.getReservation(choice.seat_code);
                                let ticketType = reservationModel.ticketTypes.find((ticketType) => {
                                    return (ticketType.code === choice.ticket_type_code);
                                });
                                if (!ticketType) {
                                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
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
                            this.next(new Error(this.req.__('Message.UnexpectedError')));
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
                // 購入番号発行
                this.createPaymentNo((err, paymentNo) => {
                    if (err) {
                        let message = this.req.__('Message.UnexpectedError');
                        this.res.redirect(`${this.router.build('staff.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                    }
                    else {
                        reservationModel.paymentNo = paymentNo;
                        // 予約プロセス固有のログファイルをセット
                        this.setProcessLogger(reservationModel.paymentNo, () => {
                            this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);
                            let promises = [];
                            let reservationDocuments4update = reservationModel.toReservationDocuments();
                            for (let reservationDocument4update of reservationDocuments4update) {
                                promises.push(new Promise((resolve, reject) => {
                                    // 予約完了
                                    reservationDocument4update['status'] = ReservationUtil_1.default.STATUS_RESERVED;
                                    reservationDocument4update['staff'] = this.staffUser.get('_id');
                                    reservationDocument4update['staff_user_id'] = this.staffUser.get('user_id');
                                    reservationDocument4update['staff_name'] = this.staffUser.get('name');
                                    reservationDocument4update['staff_email'] = this.staffUser.get('email');
                                    reservationDocument4update['staff_department_name'] = this.staffUser.get('department_name');
                                    reservationDocument4update['staff_tel'] = this.staffUser.get('tel');
                                    reservationDocument4update['staff_signature'] = this.staffUser.get('signature');
                                    this.logger.info('updating reservation all infos..._id:', reservationDocument4update['_id']);
                                    Models_1.default.Reservation.update({
                                        _id: reservationDocument4update['_id'],
                                        status: ReservationUtil_1.default.STATUS_TEMPORARY
                                    }, reservationDocument4update, (err, raw) => {
                                        this.logger.info('reservation updated.', err, raw);
                                        if (err) {
                                            reject(new Error(this.req.__('Message.UnexpectedError')));
                                        }
                                        else {
                                            resolve();
                                        }
                                    });
                                }));
                            }
                            ;
                            Promise.all(promises).then(() => {
                                this.logger.info('creating reservationEmailCue...');
                                Models_1.default.ReservationEmailCue.create({
                                    payment_no: reservationModel.paymentNo,
                                    is_sent: false
                                }, (err, reservationEmailCueDocument) => {
                                    this.logger.info('reservationEmailCue created.', err, reservationEmailCueDocument);
                                    if (err) {
                                    }
                                    reservationModel.remove((err) => {
                                        this.logger.info('redirecting to complete...');
                                        this.res.redirect(this.router.build('staff.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                                    });
                                });
                            }, (err) => {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('staff.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            });
                        });
                    }
                });
            }
            else {
                this.res.render('staff/reserve/confirm', {
                    layout: 'layouts/staff/layout',
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
            staff: this.staffUser.get('_id')
        }, (err, reservationDocuments) => {
            if (err || reservationDocuments.length < 1) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            this.res.render('staff/reserve/complete', {
                layout: 'layouts/staff/layout',
                reservationDocuments: reservationDocuments
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffReserveController;
