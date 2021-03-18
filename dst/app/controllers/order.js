"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = exports.getUnitPriceByAcceptedOffer = exports.processFixEvent = exports.processFixProfile = exports.isValidProfile = exports.processFixSeatsAndTickets = exports.complete = exports.createEmail = exports.confirm = exports.setProfile = exports.tickets = exports.performances = exports.changeCategory = exports.start = exports.processStart = exports.CODE_EXPIRES_IN_SECONDS = exports.reserveMaxDateInfo = void 0;
/**
 * 予約ベースコントローラー
 */
const cinerinoapi = require("@cinerino/sdk");
const createDebug = require("debug");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const reserveProfileForm_1 = require("../forms/reserve/reserveProfileForm");
const reserveTicketForm_1 = require("../forms/reserve/reserveTicketForm");
const session_1 = require("../models/reserve/session");
const reserve_1 = require("../factory/reserve");
// 予約可能日数定義
exports.reserveMaxDateInfo = { days: 60 };
const TRANSACTION_EXPIRES_IN_SECONDS = 900;
exports.CODE_EXPIRES_IN_SECONDS = 8035200; // 93日
const debug = createDebug('smarttheater-legacy-reservation:controller:reserveBase');
const authClient = new cinerinoapi.auth.ClientCredentials({
    domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.API_CLIENT_ID,
    clientSecret: process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const placeOrderTransactionService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
const sellerService = new cinerinoapi.service.Seller({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
const orderService = new cinerinoapi.service.Order({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
const paymentService = new cinerinoapi.service.Payment({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
/**
 * 購入開始プロセス
 */
function processStart(req) {
    return __awaiter(this, void 0, void 0, function* () {
        // 言語も指定
        req.session.locale = (typeof req.query.locale === 'string' && req.query.locale.length > 0) ? req.query.locale : 'ja';
        const searchSellersResult = yield sellerService.search({ limit: 1 });
        const seller = searchSellersResult.data.shift();
        if (seller === undefined) {
            throw new Error('Seller not found');
        }
        const expires = moment()
            .add(TRANSACTION_EXPIRES_IN_SECONDS, 'seconds')
            .toDate();
        const transaction = yield placeOrderTransactionService.start({
            expires: expires,
            object: { passport: { token: req.query.passportToken } },
            seller: { typeOf: seller.typeOf, id: seller.id }
        });
        // 取引セッションを初期化
        const transactionInProgress = {
            id: transaction.id,
            agent: transaction.agent,
            seller: seller,
            category: (req.query.wc === '1') ? 'wheelchair' : 'general',
            expires: expires.toISOString(),
            ticketTypes: [],
            purchaser: {
                lastName: '',
                firstName: '',
                tel: '',
                email: '',
                age: '',
                address: '',
                gender: '0'
            },
            // paymentMethod: cinerinoapi.factory.paymentMethodType.CreditCard,
            reservations: []
        };
        const reservationModel = new session_1.default(transactionInProgress);
        // セッションに購入者情報があれば初期値セット
        const purchaserFromSession = req.session.purchaser;
        if (purchaserFromSession !== undefined) {
            reservationModel.transactionInProgress.purchaser = purchaserFromSession;
        }
        return reservationModel;
    });
}
exports.processStart = processStart;
/**
 * 取引開始
 * waiter許可証を持って遷移してくる
 */
function start(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // 必ずこれらのパラメータを持って遷移してくる
        if (typeof req.query.wc !== 'string' || req.query.wc.length === 0
            || typeof req.query.locale !== 'string' || req.query.locale.length === 0
            || typeof req.query.passportToken !== 'string' || req.query.passportToken.length === 0) {
            res.status(http_status_1.BAD_REQUEST)
                .end('Bad Request');
            return;
        }
        debug('starting reserve...', req.query);
        try {
            // 購入結果セッション初期化
            delete req.session.transactionResult;
            const reservationModel = yield processStart(req);
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
                    res.status(http_status_1.BAD_REQUEST)
                        .end('Bad Request');
                    return;
                }
            }
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.start = start;
/**
 * 取引カテゴリーを変更する
 */
function changeCategory(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === undefined || moment(reservationModel.transactionInProgress.expires)
                .toDate() <= moment()
                .toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            const category = req.params.category;
            if (category !== 'general' && category !== 'wheelchair') {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('UnexpectedError')));
                return;
            }
            // カテゴリーを変更してパフォーマンス選択へ遷移
            reservationModel.transactionInProgress.category = category;
            reservationModel.save(req);
            res.redirect('/customer/reserve/performances');
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.changeCategory = changeCategory;
/**
 * スケジュール選択
 */
function performances(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === undefined
                || moment(reservationModel.transactionInProgress.expires)
                    .toDate() <= moment()
                    .toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            // クライアントサイドで、パフォーマンス検索にapiのトークンを使用するので
            yield authClient.refreshAccessToken();
            const token = authClient.credentials;
            debug('api access token published.');
            const maxDate = moment();
            Object.keys(exports.reserveMaxDateInfo)
                .forEach((key) => {
                maxDate.add(exports.reserveMaxDateInfo[key], key);
            });
            const reserveMaxDate = maxDate.format('YYYY/MM/DD');
            if (req.method === 'POST') {
                if (typeof req.body.performanceId === 'string' && req.body.performanceId.length > 0) {
                    // パフォーマンスfixして券種選択へ遷移
                    yield processFixEvent(reservationModel, req.body.performanceId, req);
                    reservationModel.save(req);
                    res.redirect('/customer/reserve/tickets');
                    return;
                }
            }
            res.render('customer/reserve/performances', {
                token: token,
                reserveMaxDate: reserveMaxDate,
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
            if (reservationModel === undefined
                || moment(reservationModel.transactionInProgress.expires)
                    .toDate() <= moment()
                    .toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            // パフォーマンスは指定済みのはず
            if (reservationModel.transactionInProgress.performance === undefined) {
                throw new Error(req.__('UnexpectedError'));
            }
            // reservationModel.transactionInProgress.paymentMethod = cinerinoapi.factory.paymentMethodType.CreditCard;
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
                        yield placeOrderTransactionService.voidSeatReservation({
                            id: actionId,
                            purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: reservationModel.transactionInProgress.id }
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
                    if (moment(reservationModel.transactionInProgress.performance.startDate)
                        .toDate() < moment()
                        .toDate()) {
                        //「ご希望の枚数が用意できないため予約できません。」
                        throw new Error(req.__('NoAvailableSeats'));
                    }
                    // 予約処理
                    yield processFixSeatsAndTickets(reservationModel, req);
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
// tslint:disable-next-line:max-func-body-length
function setProfile(req, res, next) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === undefined
                || moment(reservationModel.transactionInProgress.expires)
                    .toDate() <= moment()
                    .toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            let gmoError = '';
            if (req.method === 'POST') {
                //Form入力値チェック
                const isValid = yield isValidProfile(req, res);
                //GMO処理
                if (isValid) {
                    try {
                        // 購入者情報FIXプロセス
                        yield processFixProfile(reservationModel, req);
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
                res.locals.email = (typeof email === 'string') ? email : '';
                res.locals.emailConfirm = (typeof email === 'string') ? email.substr(0, email.indexOf('@')) : '';
                res.locals.emailConfirmDomain = (typeof email === 'string') ? email.substr(email.indexOf('@') + 1) : '';
                // res.locals.paymentMethod = cinerinoapi.factory.paymentMethodType.CreditCard;
            }
            let gmoShopId = '';
            // 販売者情報からクレジットカード情報を取り出す
            const paymentAccepted = reservationModel.transactionInProgress.seller.paymentAccepted;
            if (paymentAccepted !== undefined) {
                const creditCardPaymentAccepted = paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
                if (creditCardPaymentAccepted !== undefined) {
                    gmoShopId = (_a = creditCardPaymentAccepted.gmoInfo) === null || _a === void 0 ? void 0 : _a.shopId;
                }
            }
            res.render('customer/reserve/profile', {
                reservationModel: reservationModel,
                GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                GMO_SHOP_ID: gmoShopId,
                gmoError: gmoError
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.setProfile = setProfile;
/**
 * 注文確定
 */
// tslint:disable-next-line:max-func-body-length
function confirm(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === undefined
                || moment(reservationModel.transactionInProgress.expires)
                    .toDate() <= moment()
                    .toDate()) {
                res.status(http_status_1.BAD_REQUEST);
                next(new Error(req.__('Expired')));
                return;
            }
            if (req.method === 'POST') {
                try {
                    if (reservationModel.transactionInProgress.performance === undefined) {
                        throw new cinerinoapi.factory.errors.Argument('Transaction', 'Event required');
                    }
                    // 注文完了メール作成
                    const emailAttributes = createEmail(reservationModel, req, res);
                    // 取引確定
                    const transactionResult = yield placeOrderTransactionService.confirm({
                        id: reservationModel.transactionInProgress.id,
                        potentialActions: {
                            order: {
                                potentialActions: {
                                    sendOrder: {
                                        potentialActions: {
                                            sendEmailMessage: [{
                                                    object: {
                                                        sender: {
                                                            name: emailAttributes.sender.name,
                                                            email: emailAttributes.sender.email
                                                        },
                                                        toRecipient: {
                                                            name: emailAttributes.toRecipient.name,
                                                            email: emailAttributes.toRecipient.email
                                                        },
                                                        about: emailAttributes.about,
                                                        template: emailAttributes.text
                                                    }
                                                }]
                                        }
                                    }
                                }
                            }
                        }
                    });
                    const order = transactionResult.order;
                    debug('transacion confirmed. orderNumber:', transactionResult.order.orderNumber);
                    try {
                        // まず注文作成(非同期処理が間に合わない可能性ありなので)
                        yield orderService.placeOrder({
                            object: {
                                orderNumber: order.orderNumber,
                                confirmationNumber: order.confirmationNumber
                            },
                            purpose: {
                                typeOf: cinerinoapi.factory.transactionType.PlaceOrder,
                                id: reservationModel.transactionInProgress.id
                            }
                        });
                        debug('order placed', order.orderNumber);
                    }
                    catch (error) {
                        // tslint:disable-next-line:no-console
                        console.error(error);
                    }
                    // 注文承認(リトライも)
                    let code;
                    let tryCount = 0;
                    const MAX_TRY_COUNT = 3;
                    while (tryCount < MAX_TRY_COUNT) {
                        try {
                            tryCount += 1;
                            debug('publishing order code...', tryCount);
                            const authorizeOrderResult = yield orderService.authorize({
                                object: {
                                    orderNumber: order.orderNumber,
                                    customer: { telephone: order.customer.telephone }
                                },
                                result: {
                                    expiresInSeconds: exports.CODE_EXPIRES_IN_SECONDS
                                }
                            });
                            code = authorizeOrderResult.code;
                            debug('order code published', code);
                            break;
                        }
                        catch (error) {
                            // tslint:disable-next-line:no-console
                            console.error(error);
                        }
                    }
                    // 購入結果セッション作成
                    req.session.transactionResult = Object.assign(Object.assign({}, transactionResult), (typeof code === 'string') ? { code } : undefined);
                    // 購入フローセッションは削除
                    session_1.default.REMOVE(req);
                    res.redirect('/customer/reserve/complete');
                    return;
                }
                catch (error) {
                    session_1.default.REMOVE(req);
                    // 万が一注文番号が重複すると、ステータスコードCONFLICTが返却される
                    if (error.code === http_status_1.CONFLICT) {
                        next(new Error(req.__('CouldNotReserve')));
                    }
                    else {
                        next(error);
                    }
                    return;
                }
            }
            // チケットを券種コードでソート
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
function createEmail(reservationModel, req, res) {
    // 予約連携パラメータ作成
    const customerProfile = reservationModel.transactionInProgress.profile;
    if (customerProfile === undefined) {
        throw new Error('No Customer Profile');
    }
    const event = reservationModel.transactionInProgress.performance;
    if (event === undefined) {
        throw new cinerinoapi.factory.errors.Argument('Transaction', 'Event required');
    }
    const price = reservationModel.getTotalCharge();
    const ticketTypes = reservationModel.transactionInProgress.ticketTypes
        .filter((t) => Number(t.count) > 0);
    // 完了メール作成
    return reserve_1.createEmailAttributes(event, customerProfile, price, ticketTypes, req, res);
}
exports.createEmail = createEmail;
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
            const reservations = transactionResult.order.acceptedOffers
                .map((o) => {
                const unitPrice = getUnitPriceByAcceptedOffer(o);
                return Object.assign(Object.assign({}, o.itemOffered), { unitPrice: unitPrice });
            });
            // チケットを券種コードでソート
            sortReservationstByTicketType(reservations);
            res.render('customer/reserve/complete', Object.assign({ order: transactionResult.order, reservations: reservations }, (typeof transactionResult.code === 'string') ? { code: transactionResult.code } : undefined));
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.complete = complete;
/**
 * 座席・券種確定プロセス
 */
function processFixSeatsAndTickets(reservationModel, req) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // パフォーマンスは指定済みのはず
        if (reservationModel.transactionInProgress.performance === undefined) {
            throw new Error(req.__('UnexpectedError'));
        }
        // 検証(券種が選択されていること)+チケット枚数合計計算
        const checkInfo = yield checkFixSeatsAndTickets(reservationModel.transactionInProgress.ticketTypes, req);
        if (!checkInfo.status) {
            throw new Error(checkInfo.message);
        }
        // チケット情報に枚数セット(画面で選択された枚数<画面再表示用)
        reservationModel.transactionInProgress.ticketTypes.forEach((ticketType) => {
            const choice = checkInfo.choices.find((c) => ticketType.id === c.ticket_type);
            ticketType.count = (choice !== undefined) ? Number(choice.ticket_count) : 0;
        });
        // セッション中の予約リストを初期化
        reservationModel.transactionInProgress.reservations = [];
        // 座席承認アクション
        const offers = checkInfo.choicesAll.map((choice) => {
            return {
                ticket_type: choice.ticket_type,
                watcher_name: ''
            };
        });
        debug(`creating seatReservation authorizeAction on ${offers.length} offers...`);
        // tslint:disable-next-line:max-line-length
        let action;
        try {
            action = yield placeOrderTransactionService.createSeatReservationAuthorization({
                transactionId: reservationModel.transactionInProgress.id,
                performanceId: reservationModel.transactionInProgress.performance.id,
                offers: offers
            });
        }
        catch (error) {
            throw error;
        }
        reservationModel.transactionInProgress.seatReservationAuthorizeActionId = action.id;
        // セッションに保管
        reservationModel.transactionInProgress.authorizeSeatReservationResult = action.result;
        const tmpReservations = (_a = reservationModel.transactionInProgress.authorizeSeatReservationResult) === null || _a === void 0 ? void 0 : _a.responseBody.object.subReservation;
        if (Array.isArray(tmpReservations)) {
            reservationModel.transactionInProgress.reservations = tmpReservations.map((tmpReservation) => {
                var _a;
                const ticketType = tmpReservation.reservedTicket.ticketType;
                return {
                    reservedTicket: { ticketType: tmpReservation.reservedTicket.ticketType },
                    unitPrice: (typeof ((_a = ticketType.priceSpecification) === null || _a === void 0 ? void 0 : _a.price) === 'number') ? ticketType.priceSpecification.price : 0
                };
            });
        }
    });
}
exports.processFixSeatsAndTickets = processFixSeatsAndTickets;
/**
 * 座席・券種確定プロセス/検証処理
 */
function checkFixSeatsAndTickets(__, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const checkInfo = {
            status: false,
            choices: [],
            choicesAll: [],
            selectedCount: 0,
            extraCount: 0,
            message: ''
        };
        // 検証(券種が選択されていること)
        reserveTicketForm_1.default(req);
        const validationResult = yield req.getValidationResult();
        if (!validationResult.isEmpty()) {
            checkInfo.message = req.__('Invalid');
            return checkInfo;
        }
        // 画面から座席選択情報が生成できなければエラー
        const choices = JSON.parse(req.body.choices);
        if (!Array.isArray(choices)) {
            checkInfo.message = req.__('UnexpectedError');
            return checkInfo;
        }
        checkInfo.choices = choices;
        // チケット枚数合計計算
        choices.forEach((choice) => {
            // チケットセット(選択枚数分)
            checkInfo.selectedCount += Number(choice.ticket_count);
            for (let index = 0; index < Number(choice.ticket_count); index += 1) {
                const choiceInfo = {
                    ticket_type: choice.ticket_type,
                    ticketCount: 1,
                    choicesExtra: [],
                    updated: false
                };
                // 選択チケット本体分セット(選択枚数分)
                checkInfo.choicesAll.push(choiceInfo);
            }
        });
        checkInfo.status = true;
        return checkInfo;
    });
}
function isValidProfile(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        reserveProfileForm_1.default(req);
        const validationResult = yield req.getValidationResult();
        res.locals.validation = validationResult.mapped();
        res.locals.lastName = req.body.lastName;
        res.locals.firstName = req.body.firstName;
        res.locals.email = req.body.email;
        res.locals.emailConfirm = req.body.emailConfirm;
        res.locals.emailConfirmDomain = req.body.emailConfirmDomain;
        res.locals.tel = req.body.tel;
        res.locals.age = req.body.age;
        res.locals.address = req.body.address;
        res.locals.gender = req.body.gender;
        // res.locals.paymentMethod = req.body.paymentMethod;
        return validationResult.isEmpty();
    });
}
exports.isValidProfile = isValidProfile;
/**
 * 購入者情報確定プロセス
 */
function processFixProfile(reservationModel, req) {
    return __awaiter(this, void 0, void 0, function* () {
        // 購入者情報を保存して座席選択へ
        const contact = {
            lastName: (req.body.lastName !== undefined) ? req.body.lastName : '',
            firstName: (req.body.firstName !== undefined) ? req.body.firstName : '',
            tel: (req.body.tel !== undefined) ? req.body.tel : '',
            email: (req.body.email !== undefined) ? req.body.email : '',
            age: (req.body.age !== undefined) ? req.body.age : '',
            address: (req.body.address !== undefined) ? req.body.address : '',
            gender: (req.body.gender !== undefined) ? req.body.gender : ''
        };
        reservationModel.transactionInProgress.purchaser = contact;
        const profile = {
            age: contact.age,
            address: contact.address,
            email: contact.email,
            gender: contact.gender,
            givenName: contact.firstName,
            familyName: contact.lastName,
            telephone: contact.tel,
            telephoneRegion: contact.address
        };
        yield placeOrderTransactionService.setProfile({
            id: reservationModel.transactionInProgress.id,
            agent: profile
        });
        reservationModel.transactionInProgress.profile = profile;
        // セッションに購入者情報格納
        req.session.purchaser = contact;
    });
}
exports.processFixProfile = processFixProfile;
/**
 * イベントを決定するプロセス
 */
function processFixEvent(reservationModel, eventId, req) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('fixing event...', eventId);
        // イベント取得
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            auth: authClient,
            project: { id: process.env.PROJECT_ID }
        });
        const event = yield eventService.findById({ id: eventId });
        // 上映日当日まで購入可能
        const eventStartDay = Number(moment(event.startDate)
            .tz('Asia/Tokyo')
            .format('YYYYMMDD'));
        const now = Number(moment()
            .tz('Asia/Tokyo')
            .format('YYYYMMDD'));
        if (eventStartDay < now) {
            throw new Error(req.__('Message.OutOfTerm'));
        }
        // Cinerinoでオファー検索
        const offers = yield eventService.searchTicketOffers({
            event: { id: event.id },
            seller: {
                typeOf: reservationModel.transactionInProgress.seller.typeOf,
                id: reservationModel.transactionInProgress.seller.id
            },
            store: {
                id: authClient.options.clientId
            }
        });
        // idをidentifierに変換することに注意
        reservationModel.transactionInProgress.ticketTypes = offers.map((t) => {
            return Object.assign(Object.assign({}, t), { count: 0, id: t.identifier });
        });
        // パフォーマンス情報を保管
        reservationModel.transactionInProgress.performance = event;
    });
}
exports.processFixEvent = processFixEvent;
function getUnitPriceByAcceptedOffer(offer) {
    var _a;
    let unitPrice = 0;
    if (offer.priceSpecification !== undefined) {
        const priceSpecification = offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceValue = (_a = priceSpecification.priceComponent.find((c) => c.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification)) === null || _a === void 0 ? void 0 : _a.price;
            if (typeof unitPriceValue === 'number') {
                unitPrice = unitPriceValue;
            }
        }
    }
    return unitPrice;
}
exports.getUnitPriceByAcceptedOffer = getUnitPriceByAcceptedOffer;
/**
 * GMO決済FIXプロセス
 */
function processFixGMO(reservationModel, req) {
    return __awaiter(this, void 0, void 0, function* () {
        reservationModel.save(req);
        // クレジットカードオーソリ取得済であれば取消
        if (reservationModel.transactionInProgress.creditCardAuthorizeActionId !== undefined) {
            debug('canceling credit card authorization...', reservationModel.transactionInProgress.creditCardAuthorizeActionId);
            const actionId = reservationModel.transactionInProgress.creditCardAuthorizeActionId;
            delete reservationModel.transactionInProgress.creditCardAuthorizeActionId;
            yield paymentService.voidTransaction({
                id: actionId,
                object: {
                    typeOf: cinerinoapi.factory.paymentMethodType.CreditCard
                },
                purpose: {
                    typeOf: cinerinoapi.factory.transactionType.PlaceOrder,
                    id: reservationModel.transactionInProgress.id
                }
            });
            debug('credit card authorization canceled.');
        }
        const gmoTokenObject = JSON.parse(String(req.body.gmoTokenObject));
        const amount = reservationModel.getTotalCharge();
        debug('authorizing credit card payment...', gmoTokenObject, amount);
        // クレジットカードオーソリ取得
        const action = yield paymentService.authorizeCreditCard({
            object: {
                typeOf: cinerinoapi.factory.action.authorize.paymentMethod.any.ResultType.Payment,
                paymentMethod: cinerinoapi.factory.chevre.paymentMethodType.CreditCard,
                amount: amount,
                method: '1',
                creditCard: gmoTokenObject
            },
            purpose: {
                typeOf: cinerinoapi.factory.transactionType.PlaceOrder,
                id: reservationModel.transactionInProgress.id
            }
        });
        debug('credit card authorizeAction created.', action.id);
        reservationModel.transactionInProgress.creditCardAuthorizeActionId = action.id;
        // reservationModel.transactionInProgress.paymentMethodId = action.object.paymentMethodId;
    });
}
/**
 * チケットを券種コードでソートする
 */
function sortReservationstByTicketType(reservations) {
    reservations.sort((a, b) => {
        // 入塔日
        if (a.reservedTicket.ticketType.identifier > b.reservedTicket.ticketType.identifier) {
            return 1;
        }
        if (a.reservedTicket.ticketType.identifier < b.reservedTicket.ticketType.identifier) {
            return -1;
        }
        return 0;
    });
}
/**
 * 取引の確定した注文のチケット印刷
 */
function print(req, res, next) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // セッションに取引結果があるはず
            const order = (_b = (_a = req.session) === null || _a === void 0 ? void 0 : _a.transactionResult) === null || _b === void 0 ? void 0 : _b.order;
            if (order === undefined) {
                res.status(http_status_1.NOT_FOUND);
                next(new Error(req.__('NotFound')));
                return;
            }
            // POSTで印刷ページへ連携
            res.render('customer/reserve/print', {
                layout: false,
                action: `/reservations/printByOrderNumber?output=a4&locale=${(_c = req.session) === null || _c === void 0 ? void 0 : _c.locale}`,
                output: 'a4',
                orderNumber: order.orderNumber,
                confirmationNumber: order.confirmationNumber
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.print = print;
