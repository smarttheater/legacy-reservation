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
const gmo_service_1 = require("@motionpicture/gmo-service");
const conf = require("config");
const createDebug = require("debug");
const httpStatus = require("http-status");
const moment = require("moment");
const _ = require("underscore");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const session_1 = require("../../../models/reserve/session");
const ReserveBaseController_1 = require("../../ReserveBaseController");
const debug = createDebug('chevre-frontend:controller:customerReserve');
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
     * @method performances
     * @returns {Promise<void>}
     */
    performances() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.method === 'POST') {
                reservePerformanceForm_1.default(this.req);
                const validationResult = yield this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.res.render('customer/reserve/performances');
                    return;
                }
                const performaceId = this.req.body.performanceId;
                this.res.redirect(`/customer/reserve/start?performance=${performaceId}&locale=${this.req.getLocale()}`);
                return;
            }
            else {
                this.res.render('customer/reserve/performances', {
                    FilmUtil: chevre_domain_3.FilmUtil
                });
            }
        });
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
                    this.res.redirect(`/customer/reserve/${reservationModel.token}/terms`);
                }
                else {
                    // 今回は必ずパフォーマンス指定で遷移してくるはず
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    // reservationModel.save(() => {
                    //     this.res.redirect('/customer/reserve/performances');
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
                const reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    this.res.redirect(`/customer/reserve/${token}/seats`);
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
     * @method seats
     * @returns {Promise<void>}
     */
    seats() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = this.req.params.token;
                let reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                const limit = reservationModel.getSeatsLimit();
                if (this.req.method === 'POST') {
                    reserveSeatForm_1.default(this.req);
                    const validationResult = yield this.req.getValidationResult();
                    if (!validationResult.isEmpty()) {
                        this.res.redirect(`/customer/reserve/${token}/seats`);
                        return;
                    }
                    reservationModel = reservationModel;
                    const seatCodes = JSON.parse(this.req.body.seatCodes);
                    // 追加指定席を合わせて制限枚数を超過した場合
                    if (seatCodes.length > limit) {
                        const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                        this.res.redirect(`/customer/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
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
                            this.res.redirect(`/customer/reserve/${token}/tickets`);
                            return;
                        }
                        catch (error) {
                            yield reservationModel.save();
                            const message = this.req.__('Message.SelectedSeatsUnavailable');
                            let url = `/customer/reserve/${token}/seats`;
                            url += '?message=' + encodeURIComponent(message);
                            this.res.redirect(url);
                            return;
                        }
                    }
                }
                else {
                    this.res.render('customer/reserve/seats', {
                        reservationModel: reservationModel,
                        limit: limit
                    });
                    return;
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
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
                let reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                reservationModel.paymentMethod = '';
                if (this.req.method === 'POST') {
                    try {
                        reservationModel = yield this.processFixTickets(reservationModel);
                        yield reservationModel.save();
                        this.res.redirect(`/customer/reserve/${token}/profile`);
                    }
                    catch (error) {
                        this.res.redirect(`/customer/reserve/${token}/tickets`);
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
                let reservationModel = yield session_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                if (this.req.method === 'POST') {
                    try {
                        reservationModel = yield this.processFixProfile(reservationModel);
                        // クレジットカード決済のオーソリ、あるいは、オーダーID発行
                        yield this.processFixGMO(reservationModel);
                        // 予約情報確定
                        yield this.processAllExceptConfirm(reservationModel);
                        yield reservationModel.save();
                        this.res.redirect(`/customer/reserve/${token}/confirm`);
                    }
                    catch (error) {
                        console.error(error);
                        this.res.render('customer/reserve/profile', {
                            reservationModel: reservationModel,
                            GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                            GMO_SHOP_ID: process.env.GMO_SHOP_ID
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
                    this.res.render('customer/reserve/profile', {
                        reservationModel: reservationModel,
                        GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                        GMO_SHOP_ID: process.env.GMO_SHOP_ID
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
                        if (reservationModel.paymentMethod === gmo_service_1.Util.PAY_TYPE_CREDIT) {
                            yield this.processFixReservations(reservationModel.performance.day, reservationModel.paymentNo, {});
                            debug('processFixReservations processed.');
                            yield reservationModel.remove();
                            this.res.redirect(`/customer/reserve/${reservationModel.performance.day}/${reservationModel.paymentNo}/complete`);
                        }
                        else {
                            // todo リンク決済に備えて、ステータスを期限を更新する
                            // httpStatusの型定義不足のためanyにキャスト
                            // todo 一時的対処なので解決する
                            yield reservationModel.save();
                            this.res.redirect(httpStatus.PERMANENT_REDIRECT, `/GMO/reserve/${token}/start?locale=${this.req.getLocale()}`);
                        }
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
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    performance_day: this.req.params.performanceDay,
                    payment_no: this.req.params.paymentNo,
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
                const reservations = yield chevre_domain_1.Models.Reservation.find({
                    performance_day: this.req.params.performanceDay,
                    payment_no: this.req.params.paymentNo,
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
