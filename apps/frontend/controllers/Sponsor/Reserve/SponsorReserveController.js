"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const SponsorUser_1 = require('../../../models/User/SponsorUser');
const Util_1 = require('../../../../common/Util/Util');
const reservePerformanceForm_1 = require('../../../forms/Reserve/reservePerformanceForm');
const reserveSeatForm_1 = require('../../../forms/Reserve/reserveSeatForm');
const reserveTicketForm_1 = require('../../../forms/Reserve/reserveTicketForm');
const reserveProfileForm_1 = require('../../../forms/Reserve/reserveProfileForm');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
const lockFile = require('lockfile');
class SponsorReserveController extends ReserveBaseController_1.default {
    start() {
        // 予約トークンを発行
        let token = Util_1.default.createToken();
        let reservationModel = new ReservationModel_1.default();
        reservationModel.token = token;
        reservationModel.purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR;
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save((err) => {
            // パフォーマンス指定or無指定どちらか判断
            if (this.sponsorUser.get('performance')) {
                // パフォーマンスFIX
                this.processFixPerformance(reservationModel, this.sponsorUser.get('performance'), (err, reservationModel) => {
                    if (err) {
                        this.next(err);
                    }
                    else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('sponsor.reserve.seats', { token: token }));
                        });
                    }
                });
            }
            else {
                // スケジュール選択へ
                reservationModel.save((err) => {
                    this.res.redirect(this.router.build('sponsor.reserve.performances', { token: token }));
                });
            }
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
            // 外部関係者による予約数を取得
            Models_1.default.Reservation.count({
                sponsor: this.sponsorUser.get('_id')
            }, (err, reservationsCount) => {
                if (parseInt(this.sponsorUser.get('max_reservation_count')) <= reservationsCount) {
                    return this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', { limit: this.sponsorUser.get('max_reservation_count') })));
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
                    // 仮予約あればキャンセルする
                    this.processCancelSeats(reservationModel, (err, reservationModel) => {
                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.render('sponsor/reserve/performances', {
                                layout: 'layouts/sponsor/layout',
                                FilmUtil: FilmUtil_1.default,
                                reservationsCount: reservationsCount
                            });
                        });
                    });
                }
            });
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
            // 外部関係者による予約数を取得
            let lockPath = `${__dirname}/../../../../../lock/SponsorFixSeats${this.sponsorUser.get('_id')}.lock`;
            lockFile.lock(lockPath, { wait: 5000 }, (err) => {
                Models_1.default.Reservation.count({
                    sponsor: this.sponsorUser.get('_id'),
                    seat_code: {
                        $nin: reservationModel.seatCodes // 現在のフロー中の予約は除く
                    }
                }, (err, reservationsCount) => {
                    // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
                    let reservableCount = parseInt(this.sponsorUser.get('max_reservation_count')) - reservationsCount;
                    let limit = Math.min(10, reservableCount);
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
                                                        let message = err.message;
                                                        this.res.redirect(`${this.router.build('sponsor.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                                    }
                                                    else {
                                                        this.logger.debug('saving reservationModel... ');
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
                                    layout: 'layouts/sponsor/layout',
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
                                reservationModel.setReservation(reservation._id, reservation);
                            });
                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('sponsor.reserve.profile', { token: token }));
                            });
                        }
                        else {
                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                    }
                    else {
                        this.res.redirect(this.router.build('sponsor.reserve.tickets', { token: token }));
                    }
                });
            }
            else {
                this.res.render('sponsor/reserve/tickets', {
                    layout: 'layouts/sponsor/layout',
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
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
            this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (this.req.method === 'POST') {
                let form = reserveProfileForm_1.default(this.req);
                form(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: this.req.form['lastName'],
                            first_name: this.req.form['firstName'],
                            email: this.req.form['email'],
                            tel: this.req.form['tel'],
                        };
                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            // ユーザーセッションにプローフィール格納
                            this.sponsorUser.profile = {
                                last_name: this.req.form['lastName'],
                                first_name: this.req.form['firstName'],
                                email: this.req.form['email'],
                                tel: this.req.form['tel']
                            };
                            this.req.session[SponsorUser_1.default.AUTH_SESSION_NAME] = this.sponsorUser;
                            this.res.redirect(this.router.build('sponsor.reserve.confirm', { token: token }));
                        });
                    }
                    else {
                        this.res.render('sponsor/reserve/profile', {
                            layout: 'layouts/sponsor/layout',
                            reservationModel: reservationModel,
                        });
                    }
                });
            }
            else {
                this.res.locals.lastName = '';
                this.res.locals.firstName = '';
                this.res.locals.tel = '';
                this.res.locals.email = '';
                this.res.locals.emailConfirm = '';
                this.res.locals.emailConfirmDomain = '';
                // ユーザーセッションに情報があれば、フォーム初期値設定
                if (this.sponsorUser.profile) {
                    let email = this.sponsorUser.profile.email;
                    this.res.locals.lastName = this.sponsorUser.profile.last_name;
                    this.res.locals.firstName = this.sponsorUser.profile.first_name;
                    this.res.locals.tel = this.sponsorUser.profile.tel;
                    this.res.locals.email = email;
                    this.res.locals.emailConfirm = email.substr(0, email.indexOf('@'));
                    this.res.locals.emailConfirmDomain = email.substr(email.indexOf('@') + 1);
                }
                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.profile) {
                    let email = reservationModel.profile.email;
                    this.res.locals.lastName = reservationModel.profile.last_name;
                    this.res.locals.firstName = reservationModel.profile.first_name;
                    this.res.locals.tel = reservationModel.profile.tel;
                    this.res.locals.email = email;
                    this.res.locals.emailConfirm = email.substr(0, email.indexOf('@'));
                    this.res.locals.emailConfirmDomain = email.substr(email.indexOf('@') + 1);
                }
                this.res.render('sponsor/reserve/profile', {
                    layout: 'layouts/sponsor/layout',
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
                        this.res.redirect(`${this.router.build('sponsor.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
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
                                    reservationDocument4update['sponsor'] = this.sponsorUser.get('_id');
                                    reservationDocument4update['sponsor_user_id'] = this.sponsorUser.get('user_id');
                                    reservationDocument4update['sponsor_name'] = this.sponsorUser.get('name');
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
                                        this.res.redirect(this.router.build('sponsor.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                                    });
                                });
                            }, (err) => {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('sponsor.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            });
                        });
                    }
                });
            }
            else {
                this.res.render('sponsor/reserve/confirm', {
                    layout: 'layouts/sponsor/layout',
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
            sponsor: this.sponsorUser.get('_id')
        }, (err, reservationDocuments) => {
            if (err || reservationDocuments.length < 1) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            this.res.render('sponsor/reserve/complete', {
                layout: 'layouts/sponsor/layout',
                reservationDocuments: reservationDocuments
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorReserveController;
