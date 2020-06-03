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
exports.getUnitPriceByAcceptedOffer = exports.processFixPerformance = exports.processFixProfile = exports.isValidProfile = exports.processFixSeatsAndTickets = exports.processStart = void 0;
/**
 * 予約ベースコントローラー
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const tttsapi = require("@motionpicture/ttts-api-nodejs-client");
const conf = require("config");
const createDebug = require("debug");
const moment = require("moment-timezone");
const reserveProfileForm_1 = require("../forms/reserve/reserveProfileForm");
const reserveTicketForm_1 = require("../forms/reserve/reserveTicketForm");
const session_1 = require("../models/reserve/session");
const debug = createDebug('ttts-frontend:controller:reserveBase');
const authClient = new tttsapi.auth.ClientCredentials({
    domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.API_CLIENT_ID,
    clientSecret: process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const placeOrderTransactionService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient
});
const sellerService = new cinerinoapi.service.Seller({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: authClient
});
/**
 * 購入開始プロセス
 */
function processStart(req) {
    return __awaiter(this, void 0, void 0, function* () {
        // 言語も指定
        req.session.locale = (typeof req.query.locale === 'string' && req.query.locale.length > 0) ? req.query.locale : 'ja';
        const searchSellersResult = yield sellerService.search({
            limit: 1
        });
        const seller = searchSellersResult.data.shift();
        if (seller === undefined) {
            throw new Error('Seller not found');
        }
        const expires = moment().add(conf.get('temporary_reservation_valid_period_seconds'), 'seconds').toDate();
        const transaction = yield placeOrderTransactionService.start({
            expires: expires,
            object: {
                passport: { token: req.query.passportToken }
            },
            seller: { typeOf: seller.typeOf, id: seller.id }
        });
        // 取引セッションを初期化
        const transactionInProgress = {
            id: transaction.id,
            agent: transaction.agent,
            seller: seller,
            category: (req.query.wc === '1') ? 'wheelchair' : 'general',
            expires: expires.toISOString(),
            paymentMethodChoices: [cinerinoapi.factory.paymentMethodType.CreditCard],
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
            paymentMethod: cinerinoapi.factory.paymentMethodType.CreditCard,
            transactionGMO: {
                amount: 0,
                count: 0
            },
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
 * 座席・券種確定プロセス
 */
function processFixSeatsAndTickets(reservationModel, req) {
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
        if (reservationModel.transactionInProgress.authorizeSeatReservationResult !== undefined) {
            const tmpReservations = reservationModel.transactionInProgress.authorizeSeatReservationResult.responseBody.object.subReservation;
            if (Array.isArray(tmpReservations)) {
                reservationModel.transactionInProgress.reservations = tmpReservations.map((tmpReservation) => {
                    const ticketType = tmpReservation.reservedTicket.ticketType;
                    return {
                        reservedTicket: { ticketType: tmpReservation.reservedTicket.ticketType },
                        unitPrice: (ticketType.priceSpecification !== undefined) ? ticketType.priceSpecification.price : 0
                    };
                });
            }
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
        res.locals.paymentMethod = req.body.paymentMethod;
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
        // 決済方法はクレジットカード一択
        reservationModel.transactionInProgress.paymentMethod = cinerinoapi.factory.paymentMethodType.CreditCard;
        reservationModel.transactionInProgress.profile = yield placeOrderTransactionService.setCustomerContact({
            id: reservationModel.transactionInProgress.id,
            object: {
                customerContact: {
                    age: contact.age,
                    address: contact.address,
                    email: contact.email,
                    gender: contact.gender,
                    givenName: contact.firstName,
                    familyName: contact.lastName,
                    telephone: contact.tel,
                    telephoneRegion: contact.address
                }
            }
        });
        // セッションに購入者情報格納
        req.session.purchaser = contact;
    });
}
exports.processFixProfile = processFixProfile;
/**
 * パフォーマンスをFIXするプロセス
 * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
 */
function processFixPerformance(reservationModel, perfomanceId, req) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('fixing performance...', perfomanceId);
        // パフォーマンス取得
        const performanceService = new tttsapi.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: authClient
        });
        const eventService = new cinerinoapi.service.Event({
            endpoint: process.env.CINERINO_API_ENDPOINT,
            auth: authClient
        });
        const performance = yield performanceService.findPerofrmanceById({ id: perfomanceId });
        if (performance === null) {
            throw new Error(req.__('NotFound'));
        }
        // 上映日当日まで購入可能
        // tslint:disable-next-line:no-magic-numbers
        if (parseInt(moment(performance.startDate).format('YYYYMMDD'), 10) < parseInt(moment().format('YYYYMMDD'), 10)) {
            throw new Error(req.__('Message.OutOfTerm'));
        }
        if (performance.ticket_type_group === undefined || performance.ticket_type_group === null) {
            throw new Error('Ticket type group undefined');
        }
        // Cinerinoでオファー検索
        const offers = yield eventService.searchTicketOffers({
            event: { id: performance.id },
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
            return Object.assign(Object.assign(Object.assign({}, t), { count: 0 }), { id: t.identifier });
        });
        // パフォーマンス情報を保管
        reservationModel.transactionInProgress.performance = performance;
    });
}
exports.processFixPerformance = processFixPerformance;
function getUnitPriceByAcceptedOffer(offer) {
    let unitPrice = 0;
    if (offer.priceSpecification !== undefined) {
        const priceSpecification = offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceSpec = priceSpecification.priceComponent.find((c) => c.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification);
            if (unitPriceSpec !== undefined && unitPriceSpec.price !== undefined && Number.isInteger(unitPriceSpec.price)) {
                unitPrice = unitPriceSpec.price;
            }
        }
    }
    return unitPrice;
}
exports.getUnitPriceByAcceptedOffer = getUnitPriceByAcceptedOffer;
