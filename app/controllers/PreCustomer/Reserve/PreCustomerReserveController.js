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
const lockFile = require("lockfile");
const moment = require("moment");
const GMOUtil = require("../../../../common/Util/GMO/GMOUtil");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
const DEFAULT_RADIX = 10;
/**
 * 先行予約コントローラー
 *
 * @export
 * @class PreCustomerReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
class PreCustomerReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = chevre_domain_4.ReservationUtil.PURCHASER_GROUP_CUSTOMER;
        this.layou = 'layouts/preCustomer/layout';
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            // MPのIPは許可
            // tslint:disable-next-line:no-empty
            if (this.req.headers['x-forwarded-for'] && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
            }
            else {
                // 期限指定
                const now = moment();
                if (now < moment(conf.get('datetimes.reservation_start_pre_customers')) || moment(conf.get('datetimes.reservation_end_pre_customers')) < now) {
                    this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
                    return;
                }
            }
            try {
                const reservationModel = yield this.processStart();
                yield reservationModel.save();
                if (reservationModel.performance !== undefined) {
                    // パフォーマンス指定で遷移してきたら座席選択へ
                    this.res.redirect(this.router.build('pre.reserve.seats', { token: reservationModel.token }));
                }
                else {
                    // パフォーマンス指定なければパフォーマンス選択へ
                    this.res.redirect(this.router.build('pre.reserve.performances', { token: reservationModel.token }));
                }
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 規約
     */
    terms() {
        this.next(new Error('Message.NotFound'));
    }
    /**
     * スケジュール選択
     */
    performances() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.req.preCustomerUser === undefined) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            try {
                const preCustomerUser = this.req.preCustomerUser;
                const token = this.req.params.token;
                let reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                // 仮予約あればキャンセルする
                // tslint:disable-next-line:no-shadowed-variable
                try {
                    reservationModel = yield this.processCancelSeats(reservationModel);
                    yield reservationModel.save();
                    // 1.5次販売アカウントによる予約数を取得
                    // 決済中ステータスは含めない
                    const reservationsCount = yield chevre_domain_1.Models.Reservation.count({
                        $and: [
                            { pre_customer: preCustomerUser.get('_id') },
                            {
                                $or: [
                                    { status: { $in: [chevre_domain_4.ReservationUtil.STATUS_TEMPORARY, chevre_domain_4.ReservationUtil.STATUS_RESERVED] } },
                                    {
                                        status: chevre_domain_4.ReservationUtil.STATUS_WAITING_SETTLEMENT,
                                        gmo_payment_term: { $exists: true }
                                    }
                                ]
                            }
                        ]
                    }).exec();
                    const reservableCount = parseInt(preCustomerUser.get('max_reservation_count'), DEFAULT_RADIX) - reservationsCount;
                    if (reservableCount <= 0) {
                        this.next(new Error(this.req.__('Message.NoMoreReservation')));
                        return;
                    }
                    if (this.req.method === 'POST') {
                        reservePerformanceForm_1.default(this.req, this.res, () => __awaiter(this, void 0, void 0, function* () {
                            if (this.req.form !== undefined && this.req.form.isValid) {
                                // パフォーマンスFIX
                                try {
                                    reservationModel = yield this.processFixPerformance(reservationModel, this.req.form.performanceId);
                                    yield reservationModel.save();
                                    this.res.redirect(this.router.build('pre.reserve.seats', { token: token }));
                                }
                                catch (error) {
                                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                                }
                            }
                            else {
                                this.next(new Error(this.req.__('Message.UnexpectedError')));
                            }
                        }));
                    }
                    else {
                        this.res.render('preCustomer/reserve/performances', {
                            FilmUtil: chevre_domain_3.FilmUtil,
                            reservableCount: reservableCount
                        });
                    }
                }
                catch (error) {
                    this.next(error);
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
    // tslint:disable-next-line:max-func-body-length
    seats() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.req.preCustomerUser) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                return;
            }
            try {
                const preCustomerUser = this.req.preCustomerUser;
                const token = this.req.params.token;
                let reservationModel = yield ReservationModel_1.default.find(token);
                if (reservationModel === null) {
                    this.next(new Error(this.req.__('Message.Expired')));
                    return;
                }
                // 1.5次販売アカウントによる予約数を取得
                // 決済中ステータスは含めない
                const lockPath = `${__dirname}/../../../../lock/PreCustomerFixSeats${preCustomerUser.get('_id')}.lock`;
                lockFile.lockSync(lockPath, {});
                const reservationsCount = yield chevre_domain_1.Models.Reservation.count({
                    $and: [
                        { pre_customer: preCustomerUser.get('_id') },
                        {
                            $or: [
                                { status: { $in: [chevre_domain_4.ReservationUtil.STATUS_TEMPORARY, chevre_domain_4.ReservationUtil.STATUS_RESERVED] } },
                                {
                                    status: chevre_domain_4.ReservationUtil.STATUS_WAITING_SETTLEMENT,
                                    gmo_payment_term: { $exists: true }
                                }
                            ]
                        },
                        {
                            $or: [
                                { performance: { $ne: reservationModel.performance._id } },
                                {
                                    performance: reservationModel.performance._id,
                                    seat_code: { $nin: reservationModel.seatCodes }
                                }
                            ]
                        }
                    ]
                }).exec();
                // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
                const reservableCount = parseInt(preCustomerUser.get('max_reservation_count'), DEFAULT_RADIX) - reservationsCount;
                const limit = Math.min(reservationModel.getSeatsLimit(), reservableCount);
                // すでに枚数制限に達している場合
                if (limit <= 0) {
                    lockFile.unlockSync(lockPath);
                    this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() })));
                    return;
                }
                if (this.req.method === 'POST') {
                    reserveSeatForm_1.default(this.req, this.res, () => __awaiter(this, void 0, void 0, function* () {
                        if (this.req.form !== undefined && this.req.form.isValid) {
                            const seatCodes = JSON.parse(this.req.form.seatCodes);
                            // 追加指定席を合わせて制限枚数を超過した場合
                            if (seatCodes.length > limit) {
                                lockFile.unlockSync(lockPath);
                                const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                                this.res.redirect(`${this.router.build('pre.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
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
                            // 座席FIX
                            try {
                                reservationModel = yield this.processFixSeats(reservationModel, seatCodes);
                                lockFile.unlockSync(lockPath);
                                yield reservationModel.save();
                                // 券種選択へ
                                this.res.redirect(this.router.build('pre.reserve.tickets', { token: token }));
                            }
                            catch (error) {
                                yield reservationModel.save();
                                const message = this.req.__('Message.SelectedSeatsUnavailable');
                                this.res.redirect(`${this.router.build('pre.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                            }
                        }
                        else {
                            lockFile.unlock(lockPath, () => {
                                this.res.redirect(this.router.build('pre.reserve.seats', { token: token }));
                            });
                        }
                    }));
                }
                else {
                    lockFile.unlockSync(lockPath);
                    this.res.render('preCustomer/reserve/seats', {
                        reservationModel: reservationModel,
                        limit: limit,
                        reservableCount: reservableCount
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
                        this.res.redirect(this.router.build('pre.reserve.profile', { token: token }));
                    }
                    catch (error) {
                        this.res.redirect(this.router.build('pre.reserve.tickets', { token: token }));
                    }
                }
                else {
                    this.res.render('preCustomer/reserve/tickets', {
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
                        this.res.redirect(this.router.build('pre.reserve.confirm', { token: token }));
                    }
                    catch (error) {
                        this.res.render('preCustomer/reserve/profile', {
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
                    this.res.locals.email = (email) ? email : '';
                    this.res.locals.emailConfirm = (email) ? email.substr(0, email.indexOf('@')) : '';
                    this.res.locals.emailConfirmDomain = (email) ? email.substr(email.indexOf('@') + 1) : '';
                    this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;
                    this.res.render('preCustomer/reserve/profile', {
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
                        this.res.redirect(httpStatus.PERMANENT_REDIRECT, this.router.build('gmo.reserve.start', { token: token }) + `?locale=${this.req.getLocale()}`);
                    }
                    catch (error) {
                        yield reservationModel.remove();
                        this.next(error);
                    }
                }
                else {
                    this.res.render('preCustomer/reserve/confirm', {
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
                this.res.render('preCustomer/reserve/waitingSettlement', {
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
                this.res.render('preCustomer/reserve/complete', {
                    reservationDocuments: reservations
                });
            }
            catch (error) {
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
}
exports.default = PreCustomerReserveController;
