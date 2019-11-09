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
/**
 * 予約ベースコントローラー
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const tttsapi = require("@motionpicture/ttts-api-nodejs-client");
const conf = require("config");
const createDebug = require("debug");
const moment = require("moment-timezone");
const numeral = require("numeral");
const _ = require("underscore");
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
        req.session.locale = (!_.isEmpty(req.query.locale)) ? req.query.locale : 'ja';
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
            agentId: transaction.agent.id,
            seller: seller,
            sellerId: transaction.seller.id,
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
        const action = yield placeOrderTransactionService.createSeatReservationAuthorization({
            transactionId: reservationModel.transactionInProgress.id,
            performanceId: reservationModel.transactionInProgress.performance.id,
            offers: offers
        });
        reservationModel.transactionInProgress.seatReservationAuthorizeActionId = action.id;
        // セッションに保管
        reservationModel.transactionInProgress.authorizeSeatReservationResult = action.result;
        reservationModel.transactionInProgress.reservations = offers.map((o) => {
            const ticketType = reservationModel.transactionInProgress.ticketTypes.find((t) => t.id === o.ticket_type);
            if (ticketType === undefined) {
                throw new Error(`Unknown Ticket Type ${o.ticket_type}`);
            }
            return {
                reservedTicket: { ticketType: ticketType },
                unitPrice: (ticketType.priceSpecification !== undefined) ? ticketType.priceSpecification.price : 0
            };
        });
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
        const eventService = new tttsapi.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: authClient
        });
        const performance = yield eventService.findPerofrmanceById({ id: perfomanceId });
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
        // 券種セット
        reservationModel.transactionInProgress.ticketTypes = performance.ticket_type_group.ticket_types.map((t) => {
            return Object.assign({}, t, { count: 0 }, { id: t.identifier });
        });
        // パフォーマンス情報を保管
        reservationModel.transactionInProgress.performance = performance;
    });
}
exports.processFixPerformance = processFixPerformance;
/**
 * 予約完了メールを作成する
 */
function createEmailAttributes(
// order: cinerinoapi.factory.order.IOrder,
event, customerProfile, paymentNo, price, ticketTypes, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const to = (typeof customerProfile.email === 'string')
            ? customerProfile.email
            : '';
        if (to.length === 0) {
            throw new Error('email to unknown');
        }
        const title = res.__('Title');
        const titleEmail = res.__('EmailTitle');
        // メール本文取得
        const text = getMailText(
        // order,
        event, customerProfile, paymentNo, price, ticketTypes, res);
        // メール情報セット
        return new Promise((resolve) => {
            resolve({
                typeOf: cinerinoapi.factory.creativeWorkType.EmailMessage,
                sender: {
                    name: conf.get('email.fromname'),
                    email: conf.get('email.from')
                },
                toRecipient: {
                    name: `${customerProfile.givenName} ${customerProfile.familyName}`,
                    email: to
                },
                about: `${title} ${titleEmail}`,
                text: text
            });
        });
    });
}
exports.createEmailAttributes = createEmailAttributes;
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
/**
 * メール本文取得
 */
// tslint:disable-next-line:max-func-body-length
function getMailText(
// order: cinerinoapi.factory.order.IOrder,
event, customerProfile, paymentNo, price, ticketTypes, res) {
    const mail = [];
    const locale = res.locale;
    // 東京タワートップデッキツアーチケット購入完了のお知らせ
    mail.push(res.__('EmailTitle'));
    mail.push('');
    // 姓名編集: 日本語の時は"姓名"他は"名姓"
    const purchaserName = (locale === 'ja')
        ? `${customerProfile.familyName} ${customerProfile.givenName}`
        : `${customerProfile.givenName} ${customerProfile.familyName}`;
    // XXXX XXXX 様
    mail.push(res.__('EmailDestinationName{{name}}', { name: purchaserName }));
    mail.push('');
    // この度は、「東京タワー トップデッキツアー」のWEBチケット予約販売をご利用頂き、誠にありがとうございます。
    mail.push(res.__('EmailHead1').replace('$theater_name$', event.superEvent.location.name[locale]));
    // お客様がご購入されましたチケットの情報は下記の通りです。
    mail.push(res.__('EmailHead2'));
    mail.push('');
    // 購入番号
    // tslint:disable-next-line:no-magic-numbers
    mail.push(`${res.__('PaymentNo')} : ${paymentNo}`);
    // ご来塔日時
    const day = moment(event.startDate).tz('Asia/Tokyo').format('YYYY/MM/DD');
    const time = moment(event.startDate).tz('Asia/Tokyo').format('HH:mm');
    mail.push(`${res.__('EmailReserveDate')} : ${day} ${time}`);
    // 券種、枚数
    mail.push(`${res.__('TicketType')} ${res.__('TicketCount')}`);
    // 券種ごとに合計枚数算出
    // const ticketInfos = getTicketInfos(order);
    // const ticketInfos = editTicketInfos(res, getTicketInfos(order));
    // 券種ごとの表示情報編集
    ticketTypes.forEach((ticketType) => {
        const unitPrice = (ticketType.priceSpecification !== undefined) ? ticketType.priceSpecification.price : 0;
        const ticketCountEdit = res.__('{{n}}Leaf', { n: ticketType.count.toString() });
        const ticketInfoStr = `${ticketType.name[locale]} ${`\\${numeral(unitPrice).format('0,0')}`} × ${ticketCountEdit}`;
        mail.push(ticketInfoStr);
    });
    // Object.keys(ticketInfos).forEach((key) => {
    //     const ticketInfo = ticketInfos[key];
    //     const ticketCountEdit = res.__('{{n}}Leaf', { n: ticketInfo.count.toString() });
    //     const ticketInfoStr = `${(<any>ticketInfo.ticket_type_name)[locale]} ${ticketInfo.charge} × ${ticketCountEdit}`;
    //     mail.push(ticketInfoStr);
    // });
    // Object.keys(ticketInfos).forEach((key: string) => {
    //     mail.push(<string>ticketInfos[key].info);
    // });
    mail.push('-------------------------------------');
    // 合計枚数
    const numTickets = ticketTypes.reduce((a, b) => a + Number(b.count), 0);
    mail.push(res.__('EmailTotalTicketCount{{n}}', { n: numTickets.toString() }));
    // mail.push(res.__('EmailTotalTicketCount{{n}}', { n: order.acceptedOffers.length.toString() }));
    // 合計金額
    mail.push(`${res.__('TotalPrice')} ${res.__('{{price}} yen', { price: numeral(price).format('0,0') })}`);
    mail.push('-------------------------------------');
    // ※ご入場の際はQRコードが入場チケットとなります。下記のチケット照会より、QRコードを画面撮影もしくは印刷の上、ご持参ください。
    mail.push(res.__('EmailAboutQR'));
    mail.push('');
    // ●チケット照会はこちら
    mail.push(res.__('EmailInquiryUrl'));
    mail.push((conf.get('official_url_inquiry_by_locale'))[locale]);
    mail.push('');
    // ●ご入場方法はこちら
    mail.push(res.__('EmailEnterURL'));
    mail.push((conf.get('official_url_aboutentering_by_locale'))[locale]);
    mail.push('');
    // [ご注意事項]
    mail.push(res.__('EmailNotice1'));
    mail.push(res.__('EmailNotice9'));
    mail.push(res.__('EmailNotice2'));
    mail.push(res.__('EmailNotice3'));
    mail.push(res.__('EmailNotice4'));
    mail.push(res.__('EmailNotice5'));
    mail.push(res.__('EmailNotice6'));
    mail.push(res.__('EmailNotice7'));
    mail.push(res.__('EmailNotice8'));
    mail.push('');
    // ※よくあるご質問（ＦＡＱ）はこちら
    mail.push(res.__('EmailFAQURL'));
    mail.push((conf.get('official_url_faq_by_locale'))[locale]);
    mail.push('');
    // なお、このメールは、「東京タワー トップデッキツアー」の予約システムでチケットをご購入頂いた方にお送りしておりますが、チケット購入に覚えのない方に届いております場合は、下記お問い合わせ先までご連絡ください。
    mail.push(res.__('EmailFoot1').replace('$theater_name$', event.superEvent.location.name[locale]));
    // ※尚、このメールアドレスは送信専用となっておりますでので、ご返信頂けません。
    mail.push(res.__('EmailFoot2'));
    // ご不明な点がございましたら、下記番号までお問合わせください。
    mail.push(res.__('EmailFoot3'));
    mail.push('');
    // お問い合わせはこちら
    mail.push(res.__('EmailAccess1'));
    // 東京タワー TEL : 03-3433-5111 / 9：00am～17：00pm（年中無休）
    mail.push(res.__('EmailAccess2'));
    return (mail.join('\n'));
}
/**
 * 券種ごとに合計枚数算出
 */
// function getTicketInfos(order: cinerinoapi.factory.order.IOrder): ITicketInfo {
//     // 予約ごとに合計枚数算出
//     const ticketInfos: ITicketInfo = {};
//     const acceptedOffers = <cinerinoapi.factory.order.IAcceptedOffer<cinerinoapi.factory.order.IReservation>[]>order.acceptedOffers;
//     // チケットコード順にソート
//     acceptedOffers.sort((a, b) => {
//         if (a.itemOffered.reservedTicket.ticketType.identifier
//             < b.itemOffered.reservedTicket.ticketType.identifier) {
//             return -1;
//         }
//         if (a.itemOffered.reservedTicket.ticketType.identifier
//             > b.itemOffered.reservedTicket.ticketType.identifier) {
//             return 1;
//         }
//         return 0;
//     });
//     for (const acceptedOffer of acceptedOffers) {
//         const reservation = acceptedOffer.itemOffered;
//         const ticketType = reservation.reservedTicket.ticketType;
//         const price = getUnitPriceByAcceptedOffer(acceptedOffer);
//         const dataValue = ticketType.identifier;
//         // チケットタイプごとにチケット情報セット
//         if (!ticketInfos.hasOwnProperty(dataValue)) {
//             ticketInfos[dataValue] = {
//                 ticket_type_name: ticketType.name,
//                 charge: `\\${numeral(price).format('0,0')}`,
//                 count: 1
//             };
//         } else {
//             ticketInfos[dataValue].count += 1;
//         }
//     }
//     return ticketInfos;
// }
/**
 * 券種ごとの表示情報編集
 */
// function editTicketInfos(res: Response, ticketInfos: ITicketInfo): ITicketInfo {
//     const locale = res.locale;
//     // 券種ごとの表示情報編集
//     Object.keys(ticketInfos).forEach((key) => {
//         const ticketInfo = ticketInfos[key];
//         const ticketCountEdit = res.__('{{n}}Leaf', { n: ticketInfo.count.toString() });
//         ticketInfos[key].info = `${(<any>ticketInfo.ticket_type_name)[locale]} ${ticketInfo.charge} × ${ticketCountEdit}`;
//     });
//     return ticketInfos;
// }
