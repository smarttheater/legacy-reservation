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
const moment = require("moment");
const _ = require("underscore");
const GMOUtil = require("../../../../common/Util/GMO/GMOUtil");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
/**
 * 電話窓口座席予約コントローラー
 *
 * @export
 * @class TelReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
class TelReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = chevre_domain_1.ReservationUtil.PURCHASER_GROUP_TEL;
        this.layout = 'layouts/tel/layout';
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const reservationModel = yield this.processStart();
                // 購入番号発行(確認画面でペイデザイン川にコピーする際に必要になるので、事前に発行しておく)
                reservationModel.paymentNo = yield chevre_domain_1.ReservationUtil.publishPaymentNo();
                yield reservationModel.save();
                if (reservationModel.performance !== undefined) {
                    const cb = this.router.build('tel.reserve.seats', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('tel.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                }
                else {
                    const cb = this.router.build('tel.reserve.performances', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('tel.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 規約(スキップ)
     */
    terms() {
        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }
    /**
     * スケジュール選択
     */
    performances() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                let reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    reservePerformanceForm_1.default(this.req, this.res, () => __awaiter(this, void 0, void 0, function* () {
                        if (this.req.form !== undefined && this.req.form.isValid) {
                            try {
                                // パフォーマンスFIX
                                reservationModel = yield this.processFixPerformance(reservationModel, this.req.form.performanceId);
                                yield reservationModel.save();
                                this.res.redirect(this.router.build('tel.reserve.seats', { token: token }));
                            }
                            catch (error) {
                                this.next(error);
                            }
                        }
                        else {
                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }
                    }));
                }
                else {
                    // 仮予約あればキャンセルする
                    try {
                        reservationModel = yield this.processCancelSeats(reservationModel);
                        yield reservationModel.save();
                        this.res.render('tel/reserve/performances', {
                            FilmUtil: chevre_domain_1.FilmUtil
                        });
                    }
                    catch (error) {
                        this.next(error);
                    }
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 座席選択
     */
    seats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                let reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                const limit = reservationModel.getSeatsLimit();
                if (this.req.method === 'POST') {
                    reserveSeatForm_1.default(this.req, this.res, () => __awaiter(this, void 0, void 0, function* () {
                        reservationModel = reservationModel;
                        if (this.req.form !== undefined && this.req.form.isValid) {
                            const seatCodes = JSON.parse(this.req.form.seatCodes);
                            // 追加指定席を合わせて制限枚数を超過した場合
                            if (seatCodes.length > limit) {
                                const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                                this.res.redirect(`${this.router.build('tel.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                return;
                            }
                            // 仮予約あればキャンセルする
                            try {
                                reservationModel = yield this.processCancelSeats(reservationModel);
                            }
                            catch (error) {
                                this.next(error);
                                return;
                            }
                            try {
                                // 座席FIX
                                reservationModel = yield this.processFixSeats(reservationModel, seatCodes);
                                yield reservationModel.save();
                                // 券種選択へ
                                this.res.redirect(this.router.build('tel.reserve.tickets', { token: token }));
                            }
                            catch (error) {
                                yield reservationModel.save();
                                const message = this.req.__('Message.SelectedSeatsUnavailable');
                                this.res.redirect(`${this.router.build('tel.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                            }
                        }
                        else {
                            this.res.redirect(this.router.build('tel.reserve.seats', { token: token }));
                        }
                    }));
                }
                else {
                    this.res.render('tel/reserve/seats', {
                        reservationModel: reservationModel,
                        limit: limit
                    });
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 券種選択
     */
    tickets() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                let reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                reservationModel.paymentMethod = '';
                if (this.req.method === 'POST') {
                    try {
                        reservationModel = yield this.processFixTickets(reservationModel);
                        yield reservationModel.save();
                        this.res.redirect(this.router.build('tel.reserve.profile', { token: token }));
                    }
                    catch (error) {
                        this.res.redirect(this.router.build('tel.reserve.tickets', { token: token }));
                    }
                }
                else {
                    this.res.render('tel/reserve/tickets', {
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
                let reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    try {
                        reservationModel = yield this.processFixProfile(reservationModel);
                        yield reservationModel.save();
                        this.res.redirect(this.router.build('tel.reserve.confirm', { token: token }));
                    }
                    catch (error) {
                        this.res.render('tel/reserve/profile', {
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
                    this.res.locals.paymentMethod = (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CVS;
                    this.res.render('tel/reserve/profile', {
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
                let reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    try {
                        reservationModel = yield this.processConfirm(reservationModel);
                        // 予約確定
                        yield chevre_domain_1.Models.Reservation.update({
                            payment_no: reservationModel.paymentNo
                        }, {
                            status: chevre_domain_1.ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN
                        }, {
                            multi: true
                        }).exec();
                        yield reservationModel.remove();
                        this.logger.info('redirecting to complete...');
                        this.res.redirect(this.router.build('tel.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                    }
                    catch (error) {
                        yield reservationModel.remove();
                        this.next(error);
                    }
                }
                else {
                    this.res.render('tel/reserve/confirm', {
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
            if (this.req.telStaffUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            try {
                const paymentNo = this.req.params.paymentNo;
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    payment_no: paymentNo,
                    status: chevre_domain_1.ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN,
                    tel_staff: this.req.telStaffUser.get('_id'),
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
                this.res.render('tel/reserve/complete', {
                    reservationDocuments: reservations
                });
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
}
exports.default = TelReserveController;
