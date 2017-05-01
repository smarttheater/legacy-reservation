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
const gmo_service_1 = require("@motionpicture/gmo-service");
const httpStatus = require("http-status");
const moment = require("moment");
const _ = require("underscore");
const session_1 = require("../../../models/reserve/session");
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
        this.purchaserGroup = chevre_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER;
        this.layout = 'layouts/member/layout';
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.memberUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            try {
                // 予約状況を確認
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    member_user_id: this.req.memberUser.get('user_id'),
                    purchaser_group: this.purchaserGroup,
                    status: chevre_domain_1.ReservationUtil.STATUS_KEPT_BY_MEMBER
                }, 'performance seat_code status').exec();
                if (reservations.length === 0) {
                    this.next(new Error(this.req.__('Message.NoAvailableSeats')));
                    return;
                }
                let reservationModel = yield this.processStart();
                // パフォーマンスFIX
                // tslint:disable-next-line:no-shadowed-variable
                reservationModel = yield this.processFixPerformance(reservationModel, reservations[0].get('performance').toString());
                // 座席FIX
                reservations.forEach((reservation) => {
                    const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                        return (seat.code === reservation.get('seat_code'));
                    });
                    if (seatInfo === undefined) {
                        throw new Error(this.req.__('Message.UnexpectedError'));
                    }
                    reservationModel.seatCodes.push(reservation.get('seat_code'));
                    reservationModel.setReservation(reservation.get('seat_code'), {
                        _id: reservation.get('_id'),
                        status: reservation.get('status'),
                        seat_code: reservation.get('seat_code'),
                        seat_grade_name_ja: seatInfo.grade.name.ja,
                        seat_grade_name_en: seatInfo.grade.name.en,
                        seat_grade_additional_charge: seatInfo.grade.additional_charge,
                        ticket_type: '',
                        ticket_type_name_ja: '',
                        ticket_type_name_en: '',
                        ticket_type_charge: 0,
                        watcher_name: ''
                    });
                });
                // パフォーマンスと座席指定した状態で券種選択へ
                yield reservationModel.save();
                this.res.redirect(`/member/reserve/${reservationModel.token}/tickets`);
            }
            catch (error) {
                console.error(error);
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
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
                        this.res.redirect(`/member/reserve/${token}/profile`);
                    }
                    catch (error) {
                        this.res.redirect(`/member/reserve/${token}/tickets`);
                    }
                }
                else {
                    this.res.render('member/reserve/tickets', {
                        reservationModel: reservationModel
                    });
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 購入者情報
     */
    profile() {
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
                        reservationModel = yield this.processFixProfile(reservationModel);
                        yield reservationModel.save();
                        this.res.redirect(`/member/reserve/${token}/confirm`);
                    }
                    catch (error) {
                        this.res.render('member/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    }
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
                    this.res.locals.email = (!_.isEmpty(email)) ? email : '';
                    this.res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
                    this.res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
                    this.res.locals.paymentMethod =
                        (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : gmo_service_1.Util.PAY_TYPE_CREDIT;
                    this.res.render('member/reserve/profile', {
                        reservationModel: reservationModel
                    });
                }
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
                        yield reservationModel.save();
                        this.res.redirect(httpStatus.PERMANENT_REDIRECT, `/GMO/reserve/${token}/start?locale=${this.req.getLocale()}`);
                    }
                    catch (error) {
                        yield reservationModel.remove();
                        this.next(error);
                    }
                }
                else {
                    this.res.render('member/reserve/confirm', {
                        reservationModel: reservationModel
                    });
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 予約完了
     */
    complete() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    performance_day: this.req.params.performanceDay,
                    payment_no: this.req.params.paymentNo,
                    status: chevre_domain_1.ReservationUtil.STATUS_RESERVED,
                    purchased_at: {
                        // tslint:disable-next-line:no-magic-numbers
                        $gt: moment().add(-30, 'minutes').toISOString()
                    }
                }).exec();
                if (reservations.length === 0) {
                    this.next(new Error(this.req.__('Message.NotFound')));
                    return;
                }
                reservations.sort((a, b) => {
                    return chevre_domain_1.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });
                this.res.render('member/reserve/complete', {
                    reservationDocuments: reservations
                });
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
}
exports.default = MemberReserveController;
