"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const Util_1 = require('../../../../common/Util/Util');
const GMOUtil_1 = require('../../../../common/Util/GMO/GMOUtil');
const reservePerformanceForm_1 = require('../../../forms/Reserve/reservePerformanceForm');
const reserveSeatForm_1 = require('../../../forms/Reserve/reserveSeatForm');
const reserveTicketForm_1 = require('../../../forms/Reserve/reserveTicketForm');
const reserveProfileForm_1 = require('../../../forms/Reserve/reserveProfileForm');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
const lockFile = require('lockfile');
class CustomerReserveController extends ReserveBaseController_1.default {
    /**
     * スケジュール選択
     */
    performances() {
        if (this.req.method === 'POST') {
            reservePerformanceForm_1.default(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    this.res.redirect(307, this.router.build('customer.reserve.start'));
                }
                else {
                    this.res.render('customer/reserve/performances', {});
                }
            });
        }
        else {
            this.res.render('customer/reserve/performances', {
                FilmUtil: FilmUtil_1.default
            });
        }
    }
    /**
     * ポータルからパフォーマンス指定でPOSTされてくる
     */
    start() {
        reservePerformanceForm_1.default(this.req, this.res, (err) => {
            if (this.req.form.isValid) {
                // 言語も指定
                if (this.req.form['locale']) {
                    this.req.session['locale'] = this.req.form['locale'];
                }
                else {
                    this.req.session['locale'] = 'ja';
                }
                // 予約トークンを発行
                let token = Util_1.default.createToken();
                let reservationModel = new ReservationModel_1.default();
                reservationModel.token = token;
                // パフォーマンスFIX
                this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                    if (err) {
                        this.next(err);
                    }
                    else {
                        reservationModel.save((err) => {
                            this.res.redirect(`${this.router.build('customer.reserve.terms')}?cb=${encodeURIComponent(this.router.build('customer.reserve.login', { token: token }))}`);
                        });
                    }
                });
            }
            else {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    login() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            reservationModel.purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER;
            reservationModel.save((err) => {
                this.res.redirect(this.router.build('customer.reserve.seats', { token: token }));
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
            // 1アカウント1パフォーマンスごとに枚数制限
            let lockPath = `${__dirname}/../../../../../lock/CustomerFixSeats${this.mvtkUser.memberInfoResult.kiinCd}${reservationModel.performance._id}.lock`;
            lockFile.lock(lockPath, { wait: 5000 }, (err) => {
                Models_1.default.Reservation.count({
                    mvtk_kiin_cd: this.mvtkUser.memberInfoResult.kiinCd,
                    performance: reservationModel.performance._id,
                    seat_code: {
                        $nin: reservationModel.seatCodes // 現在のフロー中の予約は除く
                    }
                }, (err, reservationsCount) => {
                    let limit = CustomerReserveController.RESERVATION_LIMIT_PER_PERFORMANCE - reservationsCount;
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
                                        lockFile.unlock(lockPath, () => {
                                            let message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                                            this.res.redirect(`${this.router.build('customer.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
                                    }
                                    else {
                                        // 仮予約あればキャンセルする
                                        this.logger.debug('processCancelSeats processing...');
                                        this.processCancelSeats(reservationModel, (err, reservationModel) => {
                                            this.logger.debug('processCancelSeats processed.', err);
                                            // 座席FIX
                                            this.logger.debug('processFixSeats processing...', reservationModel.token, seatCodes);
                                            this.processFixSeats(reservationModel, seatCodes, (err, reservationModel) => {
                                                this.logger.debug('processFixSeats processed.', reservationModel.token, err);
                                                lockFile.unlock(lockPath, () => {
                                                    // 仮予約に失敗した座席コードがあった場合
                                                    if (err) {
                                                        reservationModel.save((err) => {
                                                            let message = this.req.__('Mesasge.SelectedSeatsUnavailable');
                                                            this.res.redirect(`${this.router.build('customer.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                                        });
                                                    }
                                                    else {
                                                        reservationModel.save((err) => {
                                                            // 券種選択へ
                                                            this.res.redirect(this.router.build('customer.reserve.tickets', { token: token }));
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    }
                                }
                                else {
                                    lockFile.unlock(lockPath, () => {
                                        this.res.redirect(this.router.build('customer.reserve.seats', { token: token }));
                                    });
                                }
                            });
                        }
                        else {
                            lockFile.unlock(lockPath, (err) => {
                                this.res.render('customer/reserve/seats', {
                                    reservationModel: reservationModel,
                                    limit: limit
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
                            this.logger.debug('saving reservationModel... ');
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('customer.reserve.profile', { token: token }));
                            });
                        }
                        else {
                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                    }
                    else {
                        this.res.redirect(this.router.build('customer.reserve.tickets', { token: token }));
                    }
                });
            }
            else {
                this.res.render('customer/reserve/tickets', {
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
                let form = reserveProfileForm_1.default(this.req);
                form(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: this.req.form['lastName'],
                            first_name: this.req.form['firstName'],
                            email: this.req.form['email'],
                            tel: this.req.form['tel']
                        };
                        reservationModel.paymentMethod = this.req.form['paymentMethod'];
                        this.logger.debug('saving reservationModel... ');
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.confirm', { token: token }));
                        });
                    }
                    else {
                        this.res.render('customer/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    }
                });
            }
            else {
                let email = this.mvtkUser.memberInfoResult.kiinMladdr;
                this.res.locals.lastName = this.mvtkUser.memberInfoResult.kiinsiNm;
                this.res.locals.firstName = this.mvtkUser.memberInfoResult.kiimmiNm;
                this.res.locals.tel = `${this.mvtkUser.memberInfoResult.kiinshgikykNo}${this.mvtkUser.memberInfoResult.kiinshnikykNo}${this.mvtkUser.memberInfoResult.kiinknyshNo}`;
                this.res.locals.email = email;
                this.res.locals.emailConfirm = email.substr(0, email.indexOf('@'));
                this.res.locals.emailConfirmDomain = email.substr(email.indexOf('@') + 1);
                this.res.locals.paymentMethod = GMOUtil_1.default.PAY_TYPE_CREDIT;
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
                if (reservationModel.paymentMethod) {
                    this.res.locals.paymentMethod = reservationModel.paymentMethod;
                }
                this.res.render('customer/reserve/profile', {
                    reservationModel: reservationModel
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
                // 購入番号発行
                this.createPaymentNo((err, paymentNo) => {
                    if (err) {
                        let message = this.req.__('Message.UnexpectedError');
                        this.res.redirect(`${this.router.build('customer.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                    }
                    else {
                        reservationModel.paymentNo = paymentNo;
                        // 予約プロセス固有のログファイルをセット
                        this.setProcessLogger(reservationModel.paymentNo, () => {
                            this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);
                            // いったん全情報をDBに保存
                            let promises = [];
                            let reservationDocuments4update = reservationModel.toReservationDocuments();
                            for (let reservationDocument4update of reservationDocuments4update) {
                                reservationDocument4update['mvtk_kiin_cd'] = this.mvtkUser.memberInfoResult.kiinCd;
                                promises.push(new Promise((resolve, reject) => {
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
                                reservationModel.save((err) => {
                                    this.logger.info('starting GMO payment...');
                                    this.res.redirect(this.router.build('gmo.reserve.start', { token: token }));
                                });
                            }, (err) => {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('customer.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            });
                        });
                    }
                });
            }
            else {
                this.res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 仮予約完了
     */
    waitingSettlement() {
        let paymentNo = this.req.params.paymentNo;
        Models_1.default.Reservation.find({
            payment_no: paymentNo,
            status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
            mvtk_kiin_cd: this.mvtkUser.memberInfoResult.kiinCd
        }, (err, reservationDocuments) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationDocuments.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            this.res.render('customer/reserve/waitingSettlement', {
                reservationDocuments: reservationDocuments
            });
        });
    }
    /**
     * 予約完了
     */
    complete() {
        let paymentNo = this.req.params.paymentNo;
        Models_1.default.Reservation.find({
            payment_no: paymentNo,
            status: ReservationUtil_1.default.STATUS_RESERVED,
            mvtk_kiin_cd: this.mvtkUser.memberInfoResult.kiinCd
        }, (err, reservationDocuments) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationDocuments.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            this.res.render('customer/reserve/complete', {
                reservationDocuments: reservationDocuments
            });
        });
    }
}
CustomerReserveController.RESERVATION_LIMIT_PER_PERFORMANCE = 4; // パフォーマンスあたりの最大座席確保枚数
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CustomerReserveController;
