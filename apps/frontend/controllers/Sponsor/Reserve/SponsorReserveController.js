"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const reservePerformanceForm_1 = require('../../../forms/Reserve/reservePerformanceForm');
const reserveSeatForm_1 = require('../../../forms/Reserve/reserveSeatForm');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const ScreenUtil_1 = require('../../../../common/models/Screen/ScreenUtil');
const FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
const lockFile = require('lockfile');
const moment = require('moment');
const conf = require('config');
class SponsorReserveController extends ReserveBaseController_1.default {
    constructor(...args) {
        super(...args);
        this.purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR;
        this.layout = 'layouts/sponsor/layout';
    }
    start() {
        // 期限指定
        if (moment() < moment(conf.get('datetimes.reservation_start_sponsors'))) {
            return this.next(new Error('Message.OutOfTerm'));
        }
        this.processStart((err, reservationModel) => {
            if (err)
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationModel.performance) {
                reservationModel.save((err) => {
                    let cb = this.router.build('sponsor.reserve.seats', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('sponsor.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            }
            else {
                reservationModel.save((err) => {
                    let cb = this.router.build('sponsor.reserve.performances', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('sponsor.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
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
            // 仮予約あればキャンセルする
            this.processCancelSeats(reservationModel, (err, reservationModel) => {
                reservationModel.save((err) => {
                    // 外部関係者による予約数を取得
                    Models_1.default.Reservation.count({
                        sponsor: this.req.sponsorUser.get('_id'),
                        status: { $in: [ReservationUtil_1.default.STATUS_TEMPORARY, ReservationUtil_1.default.STATUS_RESERVED] }
                    }, (err, reservationsCount) => {
                        if (parseInt(this.req.sponsorUser.get('max_reservation_count')) <= reservationsCount) {
                            return this.next(new Error(this.req.__('Message.NoMoreReservation')));
                        }
                        if (this.req.method === 'POST') {
                            reservePerformanceForm_1.default(this.req, this.res, (err) => {
                                if (this.req.form.isValid) {
                                    // パフォーマンスFIX
                                    this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                                        if (err) {
                                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                                        }
                                        else {
                                            reservationModel.save((err) => {
                                                this.res.redirect(this.router.build('sponsor.reserve.seats', { token: token }));
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
                            this.res.render('sponsor/reserve/performances', {
                                FilmUtil: FilmUtil_1.default,
                                reservationsCount: reservationsCount
                            });
                        }
                    });
                });
            });
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
            // 外部関係者による予約数を取得
            let lockPath = `${__dirname}/../../../../../lock/SponsorFixSeats${this.req.sponsorUser.get('_id')}.lock`;
            lockFile.lock(lockPath, { wait: 5000 }, (err) => {
                Models_1.default.Reservation.count({
                    sponsor: this.req.sponsorUser.get('_id'),
                    status: { $in: [ReservationUtil_1.default.STATUS_TEMPORARY, ReservationUtil_1.default.STATUS_RESERVED] },
                    seat_code: {
                        $nin: reservationModel.seatCodes // 現在のフロー中の予約は除く
                    }
                }, (err, reservationsCount) => {
                    // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
                    let reservableCount = parseInt(this.req.sponsorUser.get('max_reservation_count')) - reservationsCount;
                    let limit = Math.min(SponsorReserveController.RESERVATION_LIMIT_PER_PERFORMANCE, reservableCount);
                    // すでに枚数制限に達している場合
                    if (limit <= 0) {
                        lockFile.unlock(lockPath, (err) => {
                            this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() })));
                        });
                    }
                    else {
                        if (this.req.method === 'POST') {
                            reserveSeatForm_1.default(this.req, this.res, (err) => {
                                if (this.req.form.isValid) {
                                    let seatCodes = JSON.parse(this.req.form['seatCodes']);
                                    // 追加指定席を合わせて制限枚数を超過した場合
                                    if (seatCodes.length > limit) {
                                        lockFile.unlock(lockPath, (err) => {
                                            let message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                                            this.res.redirect(`${this.router.build('sponsor.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
                                    }
                                    else {
                                        // 仮予約あればキャンセルする
                                        this.logger.debug('processCancelSeats processing...');
                                        this.processCancelSeats(reservationModel, (err, reservationModel) => {
                                            this.logger.debug('processCancelSeats processed.', err);
                                            // 座席FIX
                                            this.processFixSeats(reservationModel, seatCodes, (err, reservationModel) => {
                                                lockFile.unlock(lockPath, () => {
                                                    if (err) {
                                                        reservationModel.save((err) => {
                                                            let message = this.req.__('Mesasge.SelectedSeatsUnavailable');
                                                            this.res.redirect(`${this.router.build('sponsor.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                                        });
                                                    }
                                                    else {
                                                        reservationModel.save((err) => {
                                                            // 券種選択へ
                                                            this.res.redirect(this.router.build('sponsor.reserve.tickets', { token: token }));
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    }
                                }
                                else {
                                    lockFile.unlock(lockPath, (err) => {
                                        this.res.redirect(this.router.build('sponsor.reserve.seats', { token: token }));
                                    });
                                }
                            });
                        }
                        else {
                            lockFile.unlock(lockPath, (err) => {
                                this.res.render('sponsor/reserve/seats', {
                                    reservationModel: reservationModel,
                                    limit: limit,
                                    reservableCount: reservableCount
                                });
                            });
                        }
                    }
                });
            });
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
                        this.res.redirect(this.router.build('sponsor.reserve.tickets', { token: token }));
                    }
                    else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('sponsor.reserve.profile', { token: token }));
                        });
                    }
                });
            }
            else {
                this.res.render('sponsor/reserve/tickets', {
                    reservationModel: reservationModel,
                });
            }
        });
    }
    /**
     * 購入者情報
     */
    profile() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                this.processFixProfile(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.render('sponsor/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    }
                    else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('sponsor.reserve.confirm', { token: token }));
                        });
                    }
                });
            }
            else {
                // セッションに情報があれば、フォーム初期値設定
                let email = reservationModel.purchaserEmail;
                this.res.locals.lastName = reservationModel.purchaserLastName;
                this.res.locals.firstName = reservationModel.purchaserFirstName;
                this.res.locals.tel = reservationModel.purchaserTel;
                this.res.locals.email = (email) ? email : '';
                this.res.locals.emailConfirm = (email) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (email) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : '';
                this.res.render('sponsor/reserve/profile', {
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
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                this.processConfirm(reservationModel, (err, reservationModel) => {
                    if (err) {
                        let message = err.message;
                        this.res.redirect(`${this.router.build('sponsor.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                    }
                    else {
                        // 予約確定
                        this.processFixReservations(reservationModel.paymentNo, {}, (err) => {
                            if (err) {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('sponsor.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            }
                            else {
                                reservationModel.remove((err) => {
                                    this.logger.info('redirecting to complete...');
                                    this.res.redirect(this.router.build('sponsor.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                                });
                            }
                        });
                    }
                });
            }
            else {
                this.res.render('sponsor/reserve/confirm', {
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
            sponsor: this.req.sponsorUser.get('_id')
        }, (err, reservations) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            reservations.sort((a, b) => {
                return ScreenUtil_1.default.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });
            this.res.render('sponsor/reserve/complete', {
                reservationDocuments: reservations
            });
        });
    }
}
SponsorReserveController.RESERVATION_LIMIT_PER_PERFORMANCE = 10; // パフォーマンスあたりの最大座席確保枚数
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorReserveController;
