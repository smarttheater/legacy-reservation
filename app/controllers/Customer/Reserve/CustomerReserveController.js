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
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const chevre_domain_3 = require("@motionpicture/chevre-domain");
const chevre_domain_4 = require("@motionpicture/chevre-domain");
const conf = require("config");
const httpStatus = require("http-status");
const moment = require("moment");
const _ = require("underscore");
const GMOUtil = require("../../../../common/Util/GMO/GMOUtil");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
/**
 * 一般座席予約コントローラー
 *
 * @export
 * @class CustomerReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
class CustomerReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = chevre_domain_4.ReservationUtil.PURCHASER_GROUP_CUSTOMER;
    }
    /**
     * スケジュール選択(本番では存在しない、実際はポータル側のページ)
     */
    performances() {
        if (this.req.method === 'POST') {
            reservePerformanceForm_1.default(this.req, this.res, () => {
                if (this.req.form !== undefined && this.req.form.isValid) {
                    const performaceId = this.req.form.performanceId;
                    this.res.redirect(this.router.build('customer.reserve.start') + `?performance=${performaceId}&locale=${this.req.getLocale()}`);
                }
                else {
                    this.res.render('customer/reserve/performances');
                }
            });
        }
        else {
            this.res.render('customer/reserve/performances', {
                FilmUtil: chevre_domain_3.FilmUtil
            });
        }
    }
    /**
     * ポータルからパフォーマンスと言語指定で遷移してくる
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            // MPのIPは許可
            // tslint:disable-next-line:no-empty
            if (this.req.headers['x-forwarded-for'] !== undefined && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
            }
            else {
                // 期限指定
                if (moment() < moment(conf.get('datetimes.reservation_start_customers_first'))) {
                    if (!_.isEmpty(this.req.query.locale)) {
                        this.req.setLocale(this.req.query.locale);
                    }
                    this.next(new Error(this.req.__('Message.OutOfTerm')));
                    return;
                }
                // 2次販売10分前より閉める
                if (moment() < moment(conf.get('datetimes.reservation_start_customers_second')) &&
                    // tslint:disable-next-line:no-magic-numbers
                    moment() > moment(conf.get('datetimes.reservation_start_customers_second')).add(-15, 'minutes')) {
                    if (!_.isEmpty(this.req.query.locale)) {
                        this.req.setLocale(this.req.query.locale);
                    }
                    this.next(new Error(this.req.__('Message.OutOfTerm')));
                    return;
                }
            }
            try {
                const reservationModel = yield this.processStart();
                if (reservationModel.performance !== undefined) {
                    yield reservationModel.save();
                    this.res.redirect(this.router.build('customer.reserve.terms', { token: reservationModel.token }));
                }
                else {
                    // 今回は必ずパフォーマンス指定で遷移してくるはず
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    // reservationModel.save(() => {
                    //     this.res.redirect(this.router.build('customer.reserve.performances', {token: token}));
                    // });
                }
            }
            catch (error) {
                this.next(error);
            }
        });
    }
    /**
     * 規約
     */
    terms() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                const reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    this.res.redirect(this.router.build('customer.reserve.seats', { token: token }));
                }
                else {
                    this.res.render('customer/reserve/terms');
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
                                this.res.redirect(`${this.router.build('customer.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                            }
                            else {
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
                                    this.res.redirect(this.router.build('customer.reserve.tickets', { token: token }));
                                }
                                catch (error) {
                                    yield reservationModel.save();
                                    const message = this.req.__('Message.SelectedSeatsUnavailable');
                                    let url = this.router.build('customer.reserve.seats', { token: token });
                                    url += '?message=' + encodeURIComponent(message);
                                    this.res.redirect(url);
                                }
                            }
                        }
                        else {
                            this.res.redirect(this.router.build('customer.reserve.seats', { token: token }));
                        }
                    }));
                }
                else {
                    this.res.render('customer/reserve/seats', {
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
                        this.res.redirect(this.router.build('customer.reserve.profile', { token: token }));
                    }
                    catch (error) {
                        this.res.redirect(this.router.build('customer.reserve.tickets', { token: token }));
                    }
                }
                else {
                    this.res.render('customer/reserve/tickets', {
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
                        this.res.redirect(this.router.build('customer.reserve.confirm', { token: token }));
                    }
                    catch (error) {
                        this.res.render('customer/reserve/profile', {
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
                        (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;
                    this.res.render('customer/reserve/profile', {
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
                        yield reservationModel.save();
                        this.logger.info('starting GMO payment...');
                        // httpStatusの型定義不足のためanyにキャスト
                        // todo 一時的対処なので解決する
                        this.res.redirect(httpStatus.PERMANENT_REDIRECT, this.router.build('gmo.reserve.start', { token: token }) + `?locale=${this.req.getLocale()}`);
                    }
                    catch (error) {
                        yield reservationModel.remove();
                        this.next(error);
                    }
                }
                else {
                    this.res.render('customer/reserve/confirm', {
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
     * 仮予約完了
     */
    waitingSettlement() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentNo = this.req.params.paymentNo;
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    payment_no: paymentNo,
                    purchaser_group: this.purchaserGroup,
                    status: chevre_domain_4.ReservationUtil.STATUS_WAITING_SETTLEMENT,
                    purchased_at: {
                        $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
                    }
                }).exec();
                if (reservations.length === 0) {
                    this.next(new Error(this.req.__('Message.NotFound')));
                    return;
                }
                reservations.sort((a, b) => {
                    return chevre_domain_2.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });
                this.res.render('customer/reserve/waitingSettlement', {
                    reservationDocuments: reservations
                });
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
                const paymentNo = this.req.params.paymentNo;
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    payment_no: paymentNo,
                    purchaser_group: this.purchaserGroup,
                    status: chevre_domain_4.ReservationUtil.STATUS_RESERVED,
                    purchased_at: {
                        $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
                    }
                }).exec();
                if (reservations.length === 0) {
                    this.next(new Error(this.req.__('Message.NotFound')));
                    return;
                }
                reservations.sort((a, b) => {
                    return chevre_domain_2.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });
                this.res.render('customer/reserve/complete', {
                    reservationDocuments: reservations
                });
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
}
exports.default = CustomerReserveController;
