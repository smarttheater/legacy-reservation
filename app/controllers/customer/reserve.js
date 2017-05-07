"use strict";
/**
 * 一般座席予約コントローラー
 *
 * @namespace controller/customer/reserve
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre = require("@motionpicture/chevre-domain");
const GMO = require("@motionpicture/gmo-service");
const conf = require("config");
const createDebug = require("debug");
const httpStatus = require("http-status");
const moment = require("moment");
const _ = require("underscore");
const reservePerformanceForm_1 = require("../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../forms/reserve/reserveSeatForm");
const session_1 = require("../../models/reserve/session");
const reserveBaseController = require("../reserveBase");
const debug = createDebug('chevre-frontend:controller:customerReserve');
const PURCHASER_GROUP = chevre.ReservationUtil.PURCHASER_GROUP_CUSTOMER;
/**
 * スケジュール選択(本番では存在しない、実際はポータル側のページ)
 * @method performances
 * @returns {Promise<void>}
 */
function performances(req, res, __) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.method === 'POST') {
            reservePerformanceForm_1.default(req);
            const validationResult = yield req.getValidationResult();
            if (!validationResult.isEmpty()) {
                res.render('customer/reserve/performances');
                return;
            }
            const performaceId = req.body.performanceId;
            res.redirect(`/customer/reserve/start?performance=${performaceId}&locale=${req.getLocale()}`);
            return;
        }
        else {
            res.render('customer/reserve/performances', {
                FilmUtil: chevre.FilmUtil
            });
        }
    });
}
exports.performances = performances;
/**
 * ポータルからパフォーマンスと言語指定で遷移してくる
 */
function start(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // MPのIPは許可
        // tslint:disable-next-line:no-empty
        if (req.headers['x-forwarded-for'] !== undefined && /^124\.155\.113\.9$/.test(req.headers['x-forwarded-for'])) {
        }
        else {
            // 期限指定
            if (moment() < moment(conf.get('datetimes.reservation_start_customers_first'))) {
                if (!_.isEmpty(req.query.locale)) {
                    req.setLocale(req.query.locale);
                }
                next(new Error(req.__('Message.OutOfTerm')));
                return;
            }
            // 2次販売10分前より閉める
            if (moment() < moment(conf.get('datetimes.reservation_start_customers_second')) &&
                // tslint:disable-next-line:no-magic-numbers
                moment() > moment(conf.get('datetimes.reservation_start_customers_second')).add(-15, 'minutes')) {
                if (!_.isEmpty(req.query.locale)) {
                    req.setLocale(req.query.locale);
                }
                next(new Error(req.__('Message.OutOfTerm')));
                return;
            }
        }
        try {
            const reservationModel = yield reserveBaseController.processStart(PURCHASER_GROUP, req);
            if (reservationModel.performance !== undefined) {
                reservationModel.save(req);
                res.redirect('/customer/reserve/terms');
            }
            else {
                // 今回は必ずパフォーマンス指定で遷移してくるはず
                next(new Error(req.__('Message.UnexpectedError')));
                // reservationModel.save(() => {
                //     res.redirect('/customer/reserve/performances');
                // });
            }
        }
        catch (error) {
            console.error(error);
            next(new Error(req.__('Message.UnexpectedError')));
        }
    });
}
exports.start = start;
/**
 * 規約
 */
function terms(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Message.Expired')));
                return;
            }
            if (req.method === 'POST') {
                res.redirect('/customer/reserve/seats');
            }
            else {
                res.render('customer/reserve/terms');
            }
        }
        catch (error) {
            next(new Error(req.__('Message.UnexpectedError')));
        }
    });
}
exports.terms = terms;
/**
 * 座席選択
 * @method seats
 * @returns {Promise<void>}
 */
function seats(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Message.Expired')));
                return;
            }
            const limit = reservationModel.getSeatsLimit();
            if (req.method === 'POST') {
                reserveSeatForm_1.default(req);
                const validationResult = yield req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    res.redirect('/customer/reserve/seats');
                    return;
                }
                reservationModel = reservationModel;
                const seatCodes = JSON.parse(req.body.seatCodes);
                // 追加指定席を合わせて制限枚数を超過した場合
                if (seatCodes.length > limit) {
                    const message = req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                    res.redirect(`/customer/reserve/seats?message=${encodeURIComponent(message)}`);
                }
                else {
                    // 仮予約あればキャンセルする
                    try {
                        yield reserveBaseController.processCancelSeats(reservationModel);
                    }
                    catch (error) {
                        next(error);
                        return;
                    }
                    try {
                        // 座席FIX
                        yield reserveBaseController.processFixSeats(reservationModel, seatCodes, req);
                        reservationModel.save(req);
                        // 券種選択へ
                        res.redirect('/customer/reserve/tickets');
                        return;
                    }
                    catch (error) {
                        reservationModel.save(req);
                        const message = req.__('Message.SelectedSeatsUnavailable');
                        res.redirect(`/customer/reserve/seats?message=${encodeURIComponent(message)}`);
                        return;
                    }
                }
            }
            else {
                res.render('customer/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit
                });
                return;
            }
        }
        catch (error) {
            next(new Error(req.__('Message.UnexpectedError')));
            return;
        }
    });
}
exports.seats = seats;
/**
 * 券種選択
 */
function tickets(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Message.Expired')));
                return;
            }
            reservationModel.paymentMethod = '';
            if (req.method === 'POST') {
                try {
                    yield reserveBaseController.processFixTickets(reservationModel, req);
                    reservationModel.save(req);
                    res.redirect('/customer/reserve/profile');
                }
                catch (error) {
                    res.redirect('/customer/reserve/tickets');
                }
            }
            else {
                res.render('customer/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        }
        catch (error) {
            next(new Error(req.__('Message.UnexpectedError')));
        }
    });
}
exports.tickets = tickets;
/**
 * 購入者情報
 */
function profile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Message.Expired')));
                return;
            }
            if (req.method === 'POST') {
                try {
                    yield reserveBaseController.processFixProfile(reservationModel, req, res);
                    // クレジットカード決済のオーソリ、あるいは、オーダーID発行
                    yield reserveBaseController.processFixGMO(reservationModel, req);
                    // 予約情報確定
                    yield reserveBaseController.processAllExceptConfirm(reservationModel, req);
                    reservationModel.save(req);
                    res.redirect('/customer/reserve/confirm');
                }
                catch (error) {
                    console.error(error);
                    res.render('customer/reserve/profile', {
                        reservationModel: reservationModel,
                        GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                        GMO_SHOP_ID: process.env.GMO_SHOP_ID
                    });
                }
            }
            else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.purchaser.email;
                res.locals.lastName = reservationModel.purchaser.lastName;
                res.locals.firstName = reservationModel.purchaser.firstName;
                res.locals.tel = reservationModel.purchaser.tel;
                res.locals.age = reservationModel.purchaser.age;
                res.locals.address = reservationModel.purchaser.address;
                res.locals.gender = reservationModel.purchaser.gender;
                res.locals.email = (!_.isEmpty(email)) ? email : '';
                res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
                res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
                res.locals.paymentMethod =
                    (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : GMO.Util.PAY_TYPE_CREDIT;
                res.render('customer/reserve/profile', {
                    reservationModel: reservationModel,
                    GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                    GMO_SHOP_ID: process.env.GMO_SHOP_ID
                });
            }
        }
        catch (error) {
            next(new Error(req.__('Message.UnexpectedError')));
        }
    });
}
exports.profile = profile;
/**
 * 予約内容確認
 */
function confirm(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Message.Expired')));
                return;
            }
            if (req.method === 'POST') {
                try {
                    yield reserveBaseController.processConfirm(reservationModel, req);
                    if (reservationModel.paymentMethod === GMO.Util.PAY_TYPE_CREDIT) {
                        yield reserveBaseController.processFixReservations(reservationModel.performance.day, reservationModel.paymentNo, {}, res);
                        debug('processFixReservations processed.');
                        session_1.default.REMOVE(req);
                        res.redirect(`/customer/reserve/${reservationModel.performance.day}/${reservationModel.paymentNo}/complete`);
                    }
                    else {
                        // todo リンク決済に備えて、ステータスを期限を更新する
                        // httpStatusの型定義不足のためanyにキャスト
                        // todo 一時的対処なので解決する
                        reservationModel.save(req);
                        res.redirect(httpStatus.PERMANENT_REDIRECT, `/GMO/reserve/start?locale=${req.getLocale()}`);
                    }
                }
                catch (error) {
                    session_1.default.REMOVE(req);
                    next(error);
                }
            }
            else {
                res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        }
        catch (error) {
            next(new Error(req.__('Message.UnexpectedError')));
        }
    });
}
exports.confirm = confirm;
/**
 * 仮予約完了
 */
function waitingSettlement(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservations = yield chevre.Models.Reservation.find({
                performance_day: req.params.performanceDay,
                payment_no: req.params.paymentNo,
                purchaser_group: PURCHASER_GROUP,
                status: chevre.ReservationUtil.STATUS_WAITING_SETTLEMENT,
                purchased_at: {
                    $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
                }
            }).exec();
            if (reservations.length === 0) {
                next(new Error(req.__('Message.NotFound')));
                return;
            }
            reservations.sort((a, b) => {
                return chevre.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });
            res.render('customer/reserve/waitingSettlement', {
                reservationDocuments: reservations
            });
        }
        catch (error) {
            next(new Error(req.__('Message.UnexpectedError')));
        }
    });
}
exports.waitingSettlement = waitingSettlement;
/**
 * 予約完了
 */
function complete(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservations = yield chevre.Models.Reservation.find({
                performance_day: req.params.performanceDay,
                payment_no: req.params.paymentNo,
                purchaser_group: PURCHASER_GROUP,
                status: chevre.ReservationUtil.STATUS_RESERVED,
                purchased_at: {
                    $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
                }
            }).exec();
            if (reservations.length === 0) {
                next(new Error(req.__('Message.NotFound')));
                return;
            }
            reservations.sort((a, b) => {
                return chevre.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });
            res.render('customer/reserve/complete', {
                reservationDocuments: reservations
            });
        }
        catch (error) {
            next(new Error(req.__('Message.UnexpectedError')));
        }
    });
}
exports.complete = complete;
