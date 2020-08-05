
/**
 * 予約ベースコントローラー
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as conf from 'config';
import * as createDebug from 'debug';
import { Request, Response } from 'express';
import * as moment from 'moment-timezone';

import reserveProfileForm from '../forms/reserve/reserveProfileForm';
import reserveTicketForm from '../forms/reserve/reserveTicketForm';
import ReserveSessionModel from '../models/reserve/session';

const debug = createDebug('ttts-frontend:controller:reserveBase');

const authClient = new cinerinoapi.auth.ClientCredentials({
    domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.API_CLIENT_ID,
    clientSecret: <string>process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const placeOrderTransactionService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: authClient
});
const sellerService = new cinerinoapi.service.Seller({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: authClient
});

/**
 * 購入開始プロセス
 */
export async function processStart(req: Request): Promise<ReserveSessionModel> {
    // 言語も指定
    (<Express.Session>req.session).locale = (typeof req.query.locale === 'string' && req.query.locale.length > 0) ? req.query.locale : 'ja';

    const searchSellersResult = await sellerService.search({
        limit: 1
    });
    const seller = searchSellersResult.data.shift();
    if (seller === undefined) {
        throw new Error('Seller not found');
    }

    const expires = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').toDate();
    const transaction = await placeOrderTransactionService.start({
        expires: expires,
        object: {
            passport: { token: req.query.passportToken }
        },
        seller: { typeOf: seller.typeOf, id: <string>seller.id }
    });

    // 取引セッションを初期化
    const transactionInProgress: Express.ITransactionInProgress = {
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
    // tslint:disable-next-line:max-line-length
    let action: cinerinoapi.factory.action.authorize.offer.seatReservation.IAction<cinerinoapi.factory.service.webAPI.Identifier.Chevre> | undefined;
    try {
        action = await placeOrderTransactionService.createSeatReservationAuthorization({
            transactionId: reservationModel.transactionInProgress.id,
            performanceId: reservationModel.transactionInProgress.performance.id,
            offers: offers
        });
    } catch (error) {
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
    reservationModel.transactionInProgress.paymentMethod = cinerinoapi.factory.paymentMethodType.CreditCard;

    const profile: cinerinoapi.factory.person.IProfile & {
        telephoneRegion?: string;
    } = {
        age: contact.age,
        address: contact.address,
        email: contact.email,
        gender: contact.gender,
        givenName: contact.firstName,
        familyName: contact.lastName,
        telephone: contact.tel,
        telephoneRegion: contact.address
    };
    await placeOrderTransactionService.setProfile({
        id: reservationModel.transactionInProgress.id,
        agent: profile
    });
    reservationModel.transactionInProgress.profile = profile;

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
    // イベント取得
    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_API_ENDPOINT,
        auth: authClient
    });

    const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: perfomanceId });

    // 上映日当日まで購入可能
    if (Number(moment(event.startDate).tz('Asia/Tokyo').format('YYYYMMDD')) < Number(moment().tz('Asia/Tokyo').format('YYYYMMDD'))) {
        throw new Error(req.__('Message.OutOfTerm'));
    }

    // Cinerinoでオファー検索
    const offers = await eventService.searchTicketOffers(
        {
            event: { id: event.id },
            seller: {
                typeOf: reservationModel.transactionInProgress.seller.typeOf,
                id: <string>reservationModel.transactionInProgress.seller.id
            },
            store: {
                id: authClient.options.clientId
            }
        }
    );

    // idをidentifierに変換することに注意
    reservationModel.transactionInProgress.ticketTypes = offers.map((t) => {
        return { ...t, ...{ count: 0 }, id: t.identifier };
    });

    // パフォーマンス情報を保管
    reservationModel.transactionInProgress.performance = event;
}

export type ICompoundPriceSpecification = cinerinoapi.factory.chevre.compoundPriceSpecification.IPriceSpecification<any>;

export function getUnitPriceByAcceptedOffer(offer: cinerinoapi.factory.order.IAcceptedOffer<cinerinoapi.factory.order.IReservation>) {
    let unitPrice: number = 0;

    if (offer.priceSpecification !== undefined) {
        const priceSpecification = <ICompoundPriceSpecification>offer.priceSpecification;
        if (Array.isArray(priceSpecification.priceComponent)) {
            const unitPriceSpec = priceSpecification.priceComponent.find(
                (c) => c.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
            );
            if (unitPriceSpec !== undefined && unitPriceSpec.price !== undefined && Number.isInteger(unitPriceSpec.price)) {
                unitPrice = unitPriceSpec.price;
            }
        }
    }

    return unitPrice;
}
