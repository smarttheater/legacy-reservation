
/**
 * 予約ベースコントローラー
 */
import * as tttsapi from '@motionpicture/ttts-api-nodejs-client';
import * as conf from 'config';
import * as createDebug from 'debug';
import { Request, Response } from 'express';
import * as moment from 'moment-timezone';
import * as numeral from 'numeral';
import * as _ from 'underscore';

import reserveProfileForm from '../forms/reserve/reserveProfileForm';
import reserveTicketForm from '../forms/reserve/reserveTicketForm';
import ReserveSessionModel from '../models/reserve/session';

const debug = createDebug('ttts-frontend:controller:reserveBase');

const authClient = new tttsapi.auth.ClientCredentials({
    domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.API_CLIENT_ID,
    clientSecret: <string>process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const placeOrderTransactionService = new tttsapi.service.transaction.PlaceOrder({
    endpoint: <string>process.env.API_ENDPOINT,
    auth: authClient
});

const organizationService = new tttsapi.service.Organization({
    endpoint: <string>process.env.API_ENDPOINT,
    auth: authClient
});

/**
 * 購入開始プロセス
 */
export async function processStart(req: Request): Promise<ReserveSessionModel> {
    // 言語も指定
    (<Express.Session>req.session).locale = (!_.isEmpty(req.query.locale)) ? req.query.locale : 'ja';

    const sellerIdentifier = 'TokyoTower';
    const seller = await organizationService.findCorporationByIdentifier({ identifier: sellerIdentifier });

    const expires = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').toDate();
    const transaction = await placeOrderTransactionService.start({
        expires: expires,
        sellerIdentifier: sellerIdentifier, // 電波塔さんの組織識別子(現時点で固定)
        purchaserGroup: tttsapi.factory.person.Group.Customer,
        passportToken: req.query.passportToken
    });
    debug('transaction started.', transaction.id);

    // 取引セッションを初期化
    const transactionInProgress: Express.ITransactionInProgress = {
        id: transaction.id,
        agentId: transaction.agent.id,
        seller: seller,
        sellerId: transaction.seller.id,
        category: (req.query.wc === '1') ? 'wheelchair' : 'general',
        expires: expires.toISOString(),
        paymentMethodChoices: [tttsapi.factory.paymentMethodType.CreditCard],
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
        paymentMethod: tttsapi.factory.paymentMethodType.CreditCard,
        purchaserGroup: transaction.object.purchaser_group,
        transactionGMO: {
            amount: 0,
            count: 0
        },
        reservations: []
    };

    const reservationModel = new ReserveSessionModel(transactionInProgress);

    // セッションに購入者情報があれば初期値セット
    const purchaserFromSession = (<Express.Session>req.session).purchaser;
    if (purchaserFromSession !== undefined) {
        reservationModel.transactionInProgress.purchaser = purchaserFromSession;
    }

    return reservationModel;
}

/**
 * 座席・券種確定プロセス
 */
export async function processFixSeatsAndTickets(reservationModel: ReserveSessionModel, req: Request): Promise<void> {
    // パフォーマンスは指定済みのはず
    if (reservationModel.transactionInProgress.performance === undefined) {
        throw new Error(req.__('UnexpectedError'));
    }

    // 検証(券種が選択されていること)+チケット枚数合計計算
    const checkInfo = await checkFixSeatsAndTickets(reservationModel.transactionInProgress.ticketTypes, req);
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
    const action = await placeOrderTransactionService.createSeatReservationAuthorization({
        transactionId: reservationModel.transactionInProgress.id,
        performanceId: reservationModel.transactionInProgress.performance.id,
        offers: offers
    });
    reservationModel.transactionInProgress.seatReservationAuthorizeActionId = action.id;

    // セッションに保管
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
}

export interface ICheckInfo {
    status: boolean;
    choices: IChoice[];
    choicesAll: IChoiceInfo[];
    selectedCount: number;
    extraCount: number;
    message: string;
}

export interface IChoice {
    ticket_count: string;
    ticket_type: string;
}

export interface IChoiceInfo {
    ticket_type: string;
    ticketCount: number;
    choicesExtra: {
        ticket_type: string;
        ticketCount: number;
        updated: boolean;
    }[];
    updated: boolean;
}

/**
 * 座席・券種確定プロセス/検証処理
 */
async function checkFixSeatsAndTickets(__: Express.ITicketType[], req: Request): Promise<ICheckInfo> {
    const checkInfo: ICheckInfo = {
        status: false,
        choices: [],
        choicesAll: [],
        selectedCount: 0,
        extraCount: 0,
        message: ''
    };
    // 検証(券種が選択されていること)
    reserveTicketForm(req);
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
        checkInfo.message = req.__('Invalid');

        return checkInfo;
    }
    // 画面から座席選択情報が生成できなければエラー
    const choices: IChoice[] = JSON.parse(req.body.choices);
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
            const choiceInfo: IChoiceInfo = {
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
}

export async function isValidProfile(req: Request, res: Response): Promise<boolean> {
    reserveProfileForm(req);

    const validationResult = await req.getValidationResult();
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
}

/**
 * 購入者情報確定プロセス
 */
export async function processFixProfile(reservationModel: ReserveSessionModel, req: Request): Promise<void> {

    // 購入者情報を保存して座席選択へ
    const contact: Express.IPurchaser = {
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
    reservationModel.transactionInProgress.paymentMethod = tttsapi.factory.paymentMethodType.CreditCard;

    const customerContact = await placeOrderTransactionService.setCustomerContact({
        transactionId: reservationModel.transactionInProgress.id,
        contact: {
            last_name: contact.lastName,
            first_name: contact.firstName,
            email: contact.email,
            tel: contact.tel,
            age: contact.age,
            address: contact.address,
            gender: contact.gender
        }
    });
    debug('customerContact set.', customerContact);

    // セッションに購入者情報格納
    (<Express.Session>req.session).purchaser = contact;
}

/**
 * パフォーマンスをFIXするプロセス
 * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
 */
export async function processFixPerformance(
    reservationModel: ReserveSessionModel, perfomanceId: string, req: Request
): Promise<void> {
    debug('fixing performance...', perfomanceId);
    // パフォーマンス取得

    const eventService = new tttsapi.service.Event({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: authClient
    });
    const performance = await eventService.findPerofrmanceById({ id: perfomanceId });
    if (performance === null) {
        throw new Error(req.__('NotFound'));
    }

    // 上映日当日まで購入可能
    // tslint:disable-next-line:no-magic-numbers
    if (parseInt(moment(performance.startDate).format('YYYYMMDD'), 10) < parseInt(moment().format('YYYYMMDD'), 10)) {
        throw new Error(req.__('Message.OutOfTerm'));
    }

    // 券種セット
    reservationModel.transactionInProgress.ticketTypes = performance.ticket_type_group.ticket_types.map((t) => {
        return { ...t, ...{ count: 0 }, id: t.identifier };
    });

    // パフォーマンス情報を保管
    reservationModel.transactionInProgress.performance = performance;
}

/**
 * 予約完了メールを作成する
 */
export async function createEmailAttributes(
    order: tttsapi.factory.order.IOrder,
    res: Response
): Promise<tttsapi.factory.creativeWork.message.email.IAttributes> {
    const to = (order !== undefined && order.customer.email !== undefined)
        ? order.customer.email
        : '';
    if (to.length === 0) {
        throw new Error('email to unknown');
    }

    const title = res.__('Title');
    const titleEmail = res.__('EmailTitle');

    // メール本文取得
    const text: string = getMailText(order, res);

    // メール情報セット
    return new Promise<tttsapi.factory.creativeWork.message.email.IAttributes>((resolve) => {
        resolve({
            typeOf: tttsapi.factory.creativeWorkType.EmailMessage,
            sender: {
                name: conf.get<string>('email.fromname'),
                email: conf.get<string>('email.from')
            },
            toRecipient: {
                name: (order !== undefined && order.customer.name !== undefined)
                    ? order.customer.name
                    : '',
                email: to
            },
            about: `${title} ${titleEmail}`,
            text: text
        });
    });
}

export type ICompoundPriceSpecification = tttsapi.factory.chevre.compoundPriceSpecification.IPriceSpecification<any>;

export function getUnitPriceByAcceptedOffer(offer: tttsapi.factory.order.IAcceptedOffer<any>) {
    let unitPrice: number = 0;

    if (offer.priceSpecification !== undefined) {
        const priceSpecification = <ICompoundPriceSpecification>offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceSpec = priceSpecification.priceComponent.find(
                (c) => c.typeOf === tttsapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
            );
            if (unitPriceSpec !== undefined && unitPriceSpec.price !== undefined && Number.isInteger(unitPriceSpec.price)) {
                unitPrice = unitPriceSpec.price;
            }
        }
    }

    return unitPrice;
}

/**
 * メール本文取得
 */
function getMailText(
    order: tttsapi.factory.order.IOrder,
    res: Response
): string {
    const mail: string[] = [];
    const locale: string = res.locale;

    const event = order.acceptedOffers[0].itemOffered.reservationFor;

    // 東京タワートップデッキツアーチケット購入完了のお知らせ
    mail.push(res.__('EmailTitle'));
    mail.push('');

    // 姓名編集: 日本語の時は"姓名"他は"名姓"
    const purchaserName = (order.customer !== undefined)
        ? (locale === 'ja') ?
            `${order.customer.familyName} ${order.customer.givenName}` :
            `${order.customer.givenName} ${order.customer.familyName}`
        : '';
    // XXXX XXXX 様
    mail.push(res.__('EmailDestinationName{{name}}', { name: purchaserName }));
    mail.push('');

    // この度は、「東京タワー トップデッキツアー」のWEBチケット予約販売をご利用頂き、誠にありがとうございます。
    mail.push(res.__('EmailHead1').replace(
        '$theater_name$', (<any>event.superEvent.location.name)[locale]
    ));
    // お客様がご購入されましたチケットの情報は下記の通りです。
    mail.push(res.__('EmailHead2'));
    mail.push('');

    // 購入番号
    // tslint:disable-next-line:no-magic-numbers
    mail.push(`${res.__('PaymentNo')} : ${order.confirmationNumber.slice(-6)}`);

    // ご来塔日時
    const day: string = moment(event.startDate).tz('Asia/Tokyo').format('YYYY/MM/DD');
    const time: string = moment(event.startDate).tz('Asia/Tokyo').format('HH:mm');
    mail.push(`${res.__('EmailReserveDate')} : ${day} ${time}`);

    // 券種、枚数
    mail.push(`${res.__('TicketType')} ${res.__('TicketCount')}`);

    // 券種ごとに合計枚数算出
    const ticketInfos = editTicketInfos(res, getTicketInfos(order));
    Object.keys(ticketInfos).forEach((key: string) => {
        mail.push(ticketInfos[key].info);
    });
    mail.push('-------------------------------------');
    // 合計枚数
    mail.push(res.__('EmailTotalTicketCount{{n}}', { n: order.acceptedOffers.length.toString() }));
    // 合計金額
    mail.push(`${res.__('TotalPrice')} ${res.__('{{price}} yen', { price: numeral(order.price).format('0,0') })}`);
    mail.push('-------------------------------------');
    // ※ご入場の際はQRコードが入場チケットとなります。下記のチケット照会より、QRコードを画面撮影もしくは印刷の上、ご持参ください。
    mail.push(res.__('EmailAboutQR'));
    mail.push('');

    // ●チケット照会はこちら
    mail.push(res.__('EmailInquiryUrl'));
    mail.push((conf.get<any>('official_url_inquiry_by_locale'))[locale]);
    mail.push('');

    // ●ご入場方法はこちら
    mail.push(res.__('EmailEnterURL'));
    mail.push((conf.get<any>('official_url_aboutentering_by_locale'))[locale]);
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
    mail.push((conf.get<any>('official_url_faq_by_locale'))[locale]);
    mail.push('');

    // なお、このメールは、「東京タワー トップデッキツアー」の予約システムでチケットをご購入頂いた方にお送りしておりますが、チケット購入に覚えのない方に届いております場合は、下記お問い合わせ先までご連絡ください。
    mail.push(res.__('EmailFoot1').replace('$theater_name$', (<any>event.superEvent.location.name)[locale]));
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
function getTicketInfos(order: tttsapi.factory.order.IOrder): any {
    // 予約ごとに合計枚数算出
    const ticketInfos: {} = {};

    const acceptedOffers = order.acceptedOffers;

    // チケットコード順にソート
    acceptedOffers.sort((a, b) => {
        if (a.itemOffered.reservedTicket.ticketType.identifier < b.itemOffered.reservedTicket.ticketType.identifier) {
            return -1;
        }
        if (a.itemOffered.reservedTicket.ticketType.identifier > b.itemOffered.reservedTicket.ticketType.identifier) {
            return 1;
        }

        return 0;
    });

    for (const acceptedOffer of acceptedOffers) {
        const reservation = acceptedOffer.itemOffered;
        const ticketType = reservation.reservedTicket.ticketType;
        const price = getUnitPriceByAcceptedOffer(acceptedOffer);

        const dataValue = ticketType.identifier;
        // チケットタイプごとにチケット情報セット
        if (!ticketInfos.hasOwnProperty(dataValue)) {
            (<any>ticketInfos)[dataValue] = {
                ticket_type_name: ticketType.name,
                charge: `\\${numeral(price).format('0,0')}`,
                count: 1
            };
        } else {
            (<any>ticketInfos)[dataValue].count += 1;
        }
    }

    return ticketInfos;
}

/**
 * 券種ごとの表示情報編集
 */
function editTicketInfos(res: Response, ticketInfos: any[]): any {
    const locale = res.locale;
    // 券種ごとの表示情報編集
    Object.keys(ticketInfos).forEach((key) => {
        const ticketInfo = (<any>ticketInfos)[key];
        const ticketCountEdit = res.__('{{n}}Leaf', { n: ticketInfo.count.toString() });
        (<any>ticketInfos)[key].info = `${ticketInfo.ticket_type_name[locale]} ${ticketInfo.charge} × ${ticketCountEdit}`;
    });

    return ticketInfos;
}
