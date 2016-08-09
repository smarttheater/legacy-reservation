"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const MemberUser_1 = require('../../../models/User/MemberUser');
const Constants_1 = require('../../../../common/Util/Constants');
const Util_1 = require('../../../../common/Util/Util');
const memberReserveLoginForm_1 = require('../../../forms/Member/Reserve/memberReserveLoginForm');
const reserveTicketForm_1 = require('../../../forms/Reserve/reserveTicketForm');
const reserveProfileForm_1 = require('../../../forms/Reserve/reserveProfileForm');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
const moment = require('moment');
class MemberReserveController extends ReserveBaseController_1.default {
    /**
     * 規約
     */
    terms() {
        // 期限指定
        let now = moment();
        if (now < moment(Constants_1.default.RESERVE_START_DATETIME) || moment(Constants_1.default.RESERVE_END_DATETIME) < now) {
            return this.next(new Error('expired.'));
        }
        // ログイン中であればプロセス開始
        if (this.memberUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('member.reserve.start', {}));
        }
        if (this.req.method === 'POST') {
            memberReserveLoginForm_1.default(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', this.req.form['user_id']);
                    Models_1.default.Member.findOne({
                        user_id: this.req.form['user_id'],
                        password: this.req.form['password'],
                    }, (err, memberDocument) => {
                        if (err || memberDocument === null) {
                            this.res.render('member/reserve/terms', {});
                        }
                        else {
                            // ログイン
                            this.logger.debug('logining...memberDocument:', memberDocument);
                            this.req.session[MemberUser_1.default.AUTH_SESSION_NAME] = memberDocument;
                            this.res.redirect(this.router.build('member.reserve.start', {}));
                        }
                    });
                }
                else {
                    this.res.render('member/reserve/terms', {});
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('member/reserve/terms', {});
        }
    }
    start() {
        // 予約状況を確認
        this.logger.debug('checking reservation status... member:', this.memberUser.get('_id'));
        Models_1.default.Reservation.find({
            member: this.memberUser.get('_id'),
            status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER
        }, {}, {}, (err, reservationDocuments) => {
            // 確保中のメルマガ当選者席がなければ終了
            if (err || reservationDocuments.length < 1) {
                this.next(new Error('すでに予約済みです'));
            }
            else {
                // 予約トークンを発行
                let token = Util_1.default.createToken();
                let reservationModel = new ReservationModel_1.default();
                reservationModel.token = token;
                reservationModel.purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_MEMBER;
                // パフォーマンスFIX
                this.processFixPerformance(reservationModel, this.memberUser.get('performance'), (err, reservationModel) => {
                    if (err) {
                        this.next(err);
                    }
                    else {
                        // 確保中の座席指定情報を追加
                        for (let reservationDocument of reservationDocuments) {
                            let seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                                return (seat.code === reservationDocument.get('seat_code'));
                            });
                            reservationModel.seatCodes.push(reservationDocument.get('seat_code'));
                            reservationModel.setReservation(reservationDocument.get('seat_code'), {
                                _id: reservationDocument.get('_id'),
                                status: reservationDocument.get('status'),
                                seat_code: reservationDocument.get('seat_code'),
                                seat_grade_name: seatInfo.grade.name,
                                seat_grade_name_en: seatInfo.grade.name_en,
                                seat_grade_additional_charge: seatInfo.grade.additional_charge
                            });
                        }
                        // パフォーマンスと座席指定した状態で券種選択へ
                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('member.reserve.tickets', { token: token }));
                        });
                    }
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
                            choices.forEach((choice, index) => {
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
                                this.res.redirect(this.router.build('member.reserve.profile', { token: token }));
                            });
                        }
                        else {
                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                    }
                    else {
                        this.res.redirect(this.router.build('member.reserve.tickets', { token: token }));
                    }
                });
            }
            else {
                this.res.render('member/reserve/tickets', {
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
                            tel: this.req.form['tel']
                        };
                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('member.reserve.confirm', { token: token }));
                        });
                    }
                    else {
                        this.res.render('customer/reserve/profile', {
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
                this.res.render('member/reserve/profile', {
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
                this.res.redirect(this.router.build('gmo.reserve.start', { token: token }));
            }
            else {
                this.res.render('member/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    waitingSettlement() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }
            this.res.render('member/reserve/waitingSettlement', {
                reservationModel: reservationModel,
            });
        });
    }
    /**
     * complete reservation
     */
    complete() {
        let paymentNo = this.req.params.paymentNo;
        Models_1.default.Reservation.find({
            payment_no: paymentNo,
            status: ReservationUtil_1.default.STATUS_RESERVED,
            member: this.memberUser.get('_id')
        }, (err, reservationDocuments) => {
            if (err || reservationDocuments.length < 1) {
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
            // TODO force to logout
            // delete this.req.session[MemberUser.AUTH_SESSION_NAME];
            this.res.render('member/reserve/complete', {
                reservationDocuments: reservationDocuments
            });
        });
    }
}
/** 予約開始日時 */
MemberReserveController.RESERVE_START_DATETIME = '2016-10-22T00:00:00+09:00';
/** 予約終了日時 */
MemberReserveController.RESERVE_END_DATETIME = '2016-10-24T23:59:59+09:00';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberReserveController;
