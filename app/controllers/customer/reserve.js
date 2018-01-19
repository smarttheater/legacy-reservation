"use strict";
/**
 * 一般座席予約コントローラー
 * @namespace controller.customer.reserve
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
const tttsapi = require("@motionpicture/ttts-api-nodejs-client");
const conf = require("config");
const createDebug = require("debug");
const http_status_1 = require("http-status");
const moment = require("moment");
const _ = require("underscore");
const reservePaymentCreditForm_1 = require("../../forms/reserve/reservePaymentCreditForm");
const reservePerformanceForm_1 = require("../../forms/reserve/reservePerformanceForm");
const session_1 = require("../../models/reserve/session");
const reserveBaseController = require("../reserveBase");
const debug = createDebug('ttts-frontend:controller:customerReserve');
const PURCHASER_GROUP = tttsapi.factory.person.Group.Customer;
const reserveMaxDateInfo = conf.get('reserve_max_date');
const reservableEventStartFrom = moment(process.env.RESERVABLE_EVENT_START_FROM).toDate();
const authClient = new tttsapi.auth.ClientCredentials({
    domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.API_CLIENT_ID,
    clientSecret: process.env.API_CLIENT_SECRET,
    scopes: [
        `${process.env.API_RESOURECE_SERVER_IDENTIFIER}/performances.read-only`,
        `${process.env.API_RESOURECE_SERVER_IDENTIFIER}/transactions`
    ],
    state: ''
});
const placeOrderTransactionService = new tttsapi.service.transaction.PlaceOrder({
    endpoint: process.env.API_ENDPOINT,
    auth: authClient
});
/**
 * 取引開始
 * waiter許可証を持って遷移してくる
 */
function start(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // 必ずこれらのパラメータを持って遷移してくる
        if (_.isEmpty(req.query.wc) || _.isEmpty(req.query.locale) || _.isEmpty(req.query.passportToken)) {
            res.status(http_status_1.BAD_REQUEST).end('Bad Request');
            return;
        }
        debug('starting reserve...', req.query);
        // MPのIPは許可
        const ip = req.headers['x-forwarded-for'];
        const regex = /^124\.155\.113\.9$/;
        if (ip !== undefined && regex.test(ip)) {
            // no op
        }
        else {
            // 期限指定
            if (moment() < moment(conf.get('datetimes.reservation_start_customers_first'))) {
                if (!_.isEmpty(req.query.locale)) {
                    req.setLocale(req.query.locale);
                }
                res.status(http_status_1.BAD_REQUEST);
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
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Message.OutOfTerm')));
                return;
            }
        }
        try {
            // 購入結果セッション初期化
            delete req.session.transactionResult;
            delete req.session.printToken;
            const reservationModel = yield reserveBaseController.processStart(PURCHASER_GROUP, req);
            reservationModel.save(req);
            // パフォーマンス選択へ遷移
            res.redirect('/customer/reserve/performances');
        }
        catch (error) {
            debug('processStart failed.', error);
            if (Number.isInteger(error.code)) {
                if (error.code >= http_status_1.INTERNAL_SERVER_ERROR) {
                    // no op
                }
                else if (error.code >= http_status_1.BAD_REQUEST) {
                    res.status(http_status_1.BAD_REQUEST).end('Bad Request');
                    return;
                }
            }
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.start = start;
/**
 * スケジュール選択
 * @method performances
 * @returns {Promise<void>}
 */
function performances(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            // クライアントサイドで、パフォーマンス検索にapiのトークンを使用するので
            yield authClient.refreshAccessToken();
            const token = authClient.credentials;
            debug('tttsapi access token published.');
            const maxDate = moment();
            Object.keys(reserveMaxDateInfo).forEach((key) => {
                maxDate.add(reserveMaxDateInfo[key], key);
            });
            const reserveMaxDate = maxDate.format('YYYY/MM/DD');
            if (req.method === 'POST') {
                reservePerformanceForm_1.default(req);
                const validationResult = yield req.getValidationResult();
                if (validationResult.isEmpty()) {
                    // パフォーマンスfixして券種選択へ遷移
                    yield reserveBaseController.processFixPerformance(reservationModel, req.body.performanceId, req);
                    reservationModel.save(req);
                    res.redirect('/customer/reserve/tickets');
                    return;
                }
            }
            res.render('customer/reserve/performances', {
                token: token,
                reserveMaxDate: reserveMaxDate,
                reservableEventStartFrom: moment(reservableEventStartFrom).toISOString(),
                category: reservationModel.transactionInProgress.category
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.performances = performances;
/**
 * 券種選択
 */
function tickets(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            // パフォーマンスは指定済みのはず
            if (reservationModel.transactionInProgress.performance === undefined) {
                throw new Error(req.__('UnexpectedError'));
            }
            reservationModel.transactionInProgress.paymentMethod = tttsapi.factory.paymentMethodType.CreditCard;
            res.locals.message = '';
            if (req.method === 'POST') {
                // 仮予約あればキャンセルする
                try {
                    // セッション中の予約リストを初期化
                    reservationModel.transactionInProgress.reservations = [];
                    // 座席仮予約があればキャンセル
                    if (reservationModel.transactionInProgress.seatReservationAuthorizeActionId !== undefined) {
                        debug('canceling seat reservation authorize action...');
                        const actionId = reservationModel.transactionInProgress.seatReservationAuthorizeActionId;
                        delete reservationModel.transactionInProgress.seatReservationAuthorizeActionId;
                        yield placeOrderTransactionService.cancelSeatReservationAuthorization({
                            transactionId: reservationModel.transactionInProgress.id,
                            actionId: actionId
                        });
                        debug('seat reservation authorize action canceled.');
                    }
                }
                catch (error) {
                    next(error);
                    return;
                }
                try {
                    // 現在時刻が開始時刻を過ぎている時
                    if (moment(reservationModel.transactionInProgress.performance.start_date).toDate() < moment().toDate()) {
                        //「ご希望の枚数が用意できないため予約できません。」
                        throw new Error(req.__('NoAvailableSeats'));
                    }
                    // 予約処理
                    yield reserveBaseController.processFixSeatsAndTickets(reservationModel, req);
                    reservationModel.save(req);
                    res.redirect('/customer/reserve/profile');
                    return;
                }
                catch (error) {
                    // "予約可能な席がございません"などのメッセージ表示
                    res.locals.message = error.message;
                    // 残席数不足、あるいは車椅子レート制限を超過の場合
                    if (error.code === http_status_1.CONFLICT || error.code === http_status_1.TOO_MANY_REQUESTS) {
                        res.locals.message = req.__('NoAvailableSeats');
                    }
                }
            }
            // 券種選択画面へ遷移
            res.render('customer/reserve/tickets', {
                reservationModel: reservationModel
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
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
            if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            let gmoError = '';
            if (req.method === 'POST') {
                try {
                    // 購入者情報FIXプロセス
                    yield reserveBaseController.processFixProfile(reservationModel, req, res);
                    try {
                        // クレジットカード決済のオーソリ、あるいは、オーダーID発行
                        yield processFixGMO(reservationModel, req);
                    }
                    catch (error) {
                        debug('failed in fixing GMO.', error.code, error);
                        if (error.code === http_status_1.BAD_REQUEST) {
                            throw new Error(req.__('BadCard'));
                            // いったん保留
                            // switch (e.errors[0].code) {
                            //     case 'E92':
                            //         // "只今、大変込み合っていますので、しばらく時間をあけて再度決済を行ってください。"
                            //         errMsg = req.__('TransactionBusy');
                            //         break;
                            //     case 'G02':
                            //         // "カード残高が不足しているために、決済を完了する事が出来ませんでした。"
                            //         errMsg = req.__('InsufficientCard');
                            //         break;
                            //     case 'G03':
                            //         // "カード限度額を超えているために、決済を完了する事が出来ませんでした。"
                            //         errMsg = req.__('MaxedCard');
                            //         break;
                            //     case 'G04':
                            //         // "カード残高が不足しているために、決済を完了する事が出来ませんでした。"
                            //         errMsg = req.__('InsufficientCard');
                            //         break;
                            //     case 'G05':
                            //         // "カード限度額を超えているために、決済を完了する事が出来ませんでした。"
                            //         errMsg = req.__('MaxedCard');
                            //         break;
                            //     default:
                            //         // "このカードでは取引をする事が出来ません。"
                            //         errMsg = req.__('BadCard');
                            //         break;
                            // }
                        }
                        throw new Error(req.__('UnexpectedError'));
                    }
                    reservationModel.save(req);
                    res.redirect('/customer/reserve/confirm');
                    return;
                }
                catch (error) {
                    gmoError = error.message;
                }
            }
            else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.transactionInProgress.purchaser.email;
                res.locals.lastName = reservationModel.transactionInProgress.purchaser.lastName;
                res.locals.firstName = reservationModel.transactionInProgress.purchaser.firstName;
                res.locals.tel = reservationModel.transactionInProgress.purchaser.tel;
                res.locals.age = reservationModel.transactionInProgress.purchaser.age;
                res.locals.address = reservationModel.transactionInProgress.purchaser.address;
                res.locals.gender = reservationModel.transactionInProgress.purchaser.gender;
                res.locals.email = (!_.isEmpty(email)) ? email : '';
                res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
                res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
                res.locals.paymentMethod =
                    (!_.isEmpty(reservationModel.transactionInProgress.paymentMethod))
                        ? reservationModel.transactionInProgress.paymentMethod
                        : tttsapi.factory.paymentMethodType.CreditCard;
            }
            res.render('customer/reserve/profile', {
                reservationModel: reservationModel,
                GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                GMO_SHOP_ID: reservationModel.transactionInProgress.seller.gmoInfo.shopId,
                gmoError: gmoError
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
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
            if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            if (req.method === 'POST') {
                try {
                    // 予約確定
                    const transactionResult = yield placeOrderTransactionService.confirm({
                        transactionId: reservationModel.transactionInProgress.id,
                        paymentMethod: reservationModel.transactionInProgress.paymentMethod
                    });
                    debug('transacion confirmed. orderNumber:', transactionResult.order.orderNumber);
                    // 購入結果セッション作成
                    req.session.transactionResult = transactionResult;
                    try {
                        // 完了メールキュー追加(あれば更新日時を更新するだけ)
                        const emailAttributes = yield reserveBaseController.createEmailAttributes(transactionResult.eventReservations, reservationModel.getTotalCharge(), res);
                        yield placeOrderTransactionService.sendEmailNotification({
                            transactionId: reservationModel.transactionInProgress.id,
                            emailMessageAttributes: emailAttributes
                        });
                        debug('email sent.');
                    }
                    catch (error) {
                        // 失敗してもスルー
                    }
                    //　購入フローセッションは削除
                    session_1.default.REMOVE(req);
                    res.redirect('/customer/reserve/complete');
                    return;
                }
                catch (error) {
                    session_1.default.REMOVE(req);
                    next(error);
                    return;
                }
            }
            // チケットをticket_type(id)でソート
            sortReservationstByTicketType(reservationModel.transactionInProgress.reservations);
            res.render('customer/reserve/confirm', {
                reservationModel: reservationModel
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.confirm = confirm;
/**
 * 予約完了
 */
function complete(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // セッションに取引結果があるはず
            const transactionResult = req.session.transactionResult;
            if (transactionResult === undefined) {
                res.status(http_status_1.NOT_FOUND);
                next(new Error(req.__('NotFound')));
                return;
            }
            let reservations = transactionResult.eventReservations;
            debug(reservations.length, 'reservation(s) found.');
            reservations = reservations.filter((r) => r.status === tttsapi.factory.reservationStatusType.ReservationConfirmed);
            // チケットをticket_type(id)でソート
            sortReservationstByTicketType(reservations);
            res.render('customer/reserve/complete', {
                reservations: reservations,
                printToken: transactionResult.printToken
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.complete = complete;
/**
 * GMO決済FIXプロセス
 * @param {ReserveSessionModel} reservationModel
 * @returns {Promise<void>}
 */
function processFixGMO(reservationModel, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const DIGIT_OF_SERIAL_NUMBER_IN_ORDER_ID = -2;
        let orderId;
        // パフォーマンスは指定済みのはず
        if (reservationModel.transactionInProgress.performance === undefined) {
            throw new Error(req.__('UnexpectedError'));
        }
        // GMOリクエスト前にカウントアップ
        reservationModel.transactionInProgress.transactionGMO.count += 1;
        reservationModel.save(req);
        switch (reservationModel.transactionInProgress.paymentMethod) {
            case tttsapi.factory.paymentMethodType.CreditCard:
                reservePaymentCreditForm_1.default(req);
                const validationResult = yield req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    throw new Error(req.__('Invalid'));
                }
                // クレジットカードオーソリ取得済であれば取消
                if (reservationModel.transactionInProgress.creditCardAuthorizeActionId !== undefined) {
                    debug('canceling credit card authorization...', reservationModel.transactionInProgress.creditCardAuthorizeActionId);
                    const actionId = reservationModel.transactionInProgress.creditCardAuthorizeActionId;
                    delete reservationModel.transactionInProgress.creditCardAuthorizeActionId;
                    yield placeOrderTransactionService.cancelCreditCardAuthorization({
                        transactionId: reservationModel.transactionInProgress.id,
                        actionId: actionId
                    });
                    debug('credit card authorization canceled.');
                }
                // GMO取引作成
                const count = `00${reservationModel.transactionInProgress.transactionGMO.count}`.slice(DIGIT_OF_SERIAL_NUMBER_IN_ORDER_ID);
                // オーダーID 予約日 + 上映日 + 購入番号 + オーソリカウント(2桁)
                // tslint:disable-next-line:max-line-length
                orderId = `${moment().format('YYMMDD')}${reservationModel.transactionInProgress.performance.day}${reservationModel.transactionInProgress.paymentNo}${count}`;
                debug('orderId:', orderId);
                const gmoTokenObject = JSON.parse(req.body.gmoTokenObject);
                const amount = reservationModel.getTotalCharge();
                // クレジットカードオーソリ取得
                debug('creating credit card authorizeAction...', orderId);
                const action = yield placeOrderTransactionService.createCreditCardAuthorization({
                    transactionId: reservationModel.transactionInProgress.id,
                    orderId: orderId,
                    amount: amount,
                    // tslint:disable-next-line:no-suspicious-comment
                    method: '1',
                    // method: ttts.GMO.utils.util.Method.Lump, // 支払い方法は一括
                    creditCard: gmoTokenObject
                });
                debug('credit card authorizeAction created.', action.id);
                reservationModel.transactionInProgress.creditCardAuthorizeActionId = action.id;
                reservationModel.transactionInProgress.transactionGMO.orderId = orderId;
                reservationModel.transactionInProgress.transactionGMO.amount = amount;
                break;
            default:
                break;
        }
    });
}
/**
 * チケットをticket_type(id)でソートする
 * @function
 */
function sortReservationstByTicketType(reservations) {
    // チケットをticket_type(id)でソート
    reservations.sort((a, b) => {
        // 入塔日
        if (a.ticket_type > b.ticket_type) {
            return 1;
        }
        if (a.ticket_type < b.ticket_type) {
            return -1;
        }
        return 0;
    });
}
