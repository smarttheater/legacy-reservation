"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const chevre_domain_3 = require("@motionpicture/chevre-domain");
const moment = require("moment");
const GMOUtil = require("../../../../common/Util/GMO/GMOUtil");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
/**
 * メルマガ先行会員座席予約コントローラー
 *
 * @export
 * @class MemberReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
class MemberReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = chevre_domain_2.ReservationUtil.PURCHASER_GROUP_MEMBER;
        this.layout = 'layouts/member/layout';
    }
    start() {
        if (!this.req.memberUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        // 予約状況を確認
        chevre_domain_1.Models.Reservation.find({
            member_user_id: this.req.memberUser.get('user_id'),
            purchaser_group: this.purchaserGroup,
            status: chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_MEMBER
        }, 'performance seat_code status', (err, reservations) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.NoAvailableSeats')));
            this.processStart((startErr, reservationModel) => {
                if (startErr)
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                // tslint:disable-next-line:no-empty
                if (reservationModel.performance) {
                }
                else {
                    // パフォーマンスFIX
                    // tslint:disable-next-line:no-shadowed-variable
                    this.processFixPerformance(reservationModel, reservations[0].get('performance').toString(), (fixPerformancesErr, reservationModel) => {
                        if (fixPerformancesErr)
                            return this.next(new Error(this.req.__('Message.UnexpectedError')));
                        // 座席FIX
                        for (const reservation of reservations) {
                            const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                                return (seat.code === reservation.get('seat_code'));
                            });
                            if (!seatInfo)
                                throw new Error(this.req.__('Message.UnexpectedError'));
                            reservationModel.seatCodes.push(reservation.get('seat_code'));
                            reservationModel.setReservation(reservation.get('seat_code'), {
                                _id: reservation.get('_id'),
                                status: reservation.get('status'),
                                seat_code: reservation.get('seat_code'),
                                seat_grade_name_ja: seatInfo.grade.name.ja,
                                seat_grade_name_en: seatInfo.grade.name.en,
                                seat_grade_additional_charge: seatInfo.grade.additional_charge,
                                ticket_type_code: '',
                                ticket_type_name_ja: '',
                                ticket_type_name_en: '',
                                ticket_type_charge: 0,
                                watcher_name: ''
                            });
                        }
                        // パフォーマンスと座席指定した状態で券種選択へ
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('member.reserve.tickets', { token: reservationModel.token }));
                        });
                    });
                }
            });
        });
    }
    terms() {
        this.next(new Error('Message.NotFound'));
    }
    performances() {
        this.next(new Error('Message.NotFound'));
    }
    seats() {
        this.next(new Error('Message.NotFound'));
    }
    /**
     * 券種選択
     */
    tickets() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixTickets(reservationModel, (fixTicketsErr, reservationModel) => {
                    if (fixTicketsErr) {
                        this.res.redirect(this.router.build('member.reserve.tickets', { token: token }));
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('member.reserve.profile', { token: token }));
                        });
                    }
                });
            }
            else {
                this.res.render('member/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 購入者情報
     */
    profile() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixProfile(reservationModel, (fixProfileErr, reservationModel) => {
                    if (fixProfileErr) {
                        this.res.render('member/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('member.reserve.confirm', { token: token }));
                        });
                    }
                });
            }
            else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.purchaserEmail;
                this.res.locals.lastName = reservationModel.purchaserLastName;
                this.res.locals.firstName = reservationModel.purchaserFirstName;
                this.res.locals.tel = reservationModel.purchaserTel;
                this.res.locals.age = reservationModel.purchaserAge;
                this.res.locals.address = reservationModel.purchaserAddress;
                this.res.locals.gender = reservationModel.purchaserGender;
                this.res.locals.email = (email) ? email : '';
                this.res.locals.emailConfirm = (email) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (email) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;
                this.res.render('member/reserve/profile', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 予約内容確認
     */
    confirm() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processConfirm(reservationModel, (processConfirmErr, reservationModel) => {
                    if (processConfirmErr) {
                        reservationModel.remove(() => {
                            this.next(processConfirmErr);
                        });
                    }
                    else {
                        reservationModel.save(() => {
                            this.logger.info('starting GMO payment...');
                            const STATUS_CODE_PERMANENT_REDIRECT = 308;
                            this.res.redirect(STATUS_CODE_PERMANENT_REDIRECT, this.router.build('gmo.reserve.start', { token: token }) + `?locale=${this.req.getLocale()}`);
                        });
                    }
                });
            }
            else {
                this.res.render('member/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 予約完了
     */
    complete() {
        const paymentNo = this.req.params.paymentNo;
        chevre_domain_1.Models.Reservation.find({
            payment_no: paymentNo,
            status: chevre_domain_2.ReservationUtil.STATUS_RESERVED,
            purchased_at: {
                // tslint:disable-next-line:no-magic-numbers
                $gt: moment().add(-30, 'minutes').toISOString()
            }
        }, (err, reservations) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            reservations.sort((a, b) => {
                return chevre_domain_3.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });
            this.res.render('member/reserve/complete', {
                reservationDocuments: reservations
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberReserveController;
