
/**
 * 予約ベースコントローラー
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, TOO_MANY_REQUESTS } from 'http-status';
import * as moment from 'moment-timezone';

import reservePaymentCreditForm from '../forms/reserve/reservePaymentCreditForm';
import reservePerformanceForm from '../forms/reserve/reservePerformanceForm';
import reserveProfileForm from '../forms/reserve/reserveProfileForm';
import reserveTicketForm from '../forms/reserve/reserveTicketForm';
import ReserveSessionModel from '../models/reserve/session';

import { createEmailAttributes } from '../factory/reserve';

// 予約可能日数定義
export const reserveMaxDateInfo = { days: 60 };
const TRANSACTION_EXPIRES_IN_SECONDS = 900;
export const CODE_EXPIRES_IN_SECONDS = 8035200; // 93日

const debug = createDebug('smarttheater-legacy-reservation:controller:reserveBase');

const authClient = new cinerinoapi.auth.ClientCredentials({
    domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.API_CLIENT_ID,
    clientSecret: <string>process.env.API_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const placeOrderTransactionService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
const sellerService = new cinerinoapi.service.Seller({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
const orderService = new cinerinoapi.service.Order({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});
const paymentService = new cinerinoapi.service.Payment({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: authClient,
    project: { id: process.env.PROJECT_ID }
});

/**
 * 購入開始プロセス
 */
export async function processStart(req: Request): Promise<ReserveSessionModel> {
    // 言語も指定
    (<Express.Session>req.session).locale = (typeof req.query.locale === 'string' && req.query.locale.length > 0) ? req.query.locale : 'ja';

    const searchSellersResult = await sellerService.search({ limit: 1 });
    const seller = searchSellersResult.data.shift();
    if (seller === undefined) {
        throw new Error('Seller not found');
    }

    const expires = moment()
        .add(TRANSACTION_EXPIRES_IN_SECONDS, 'seconds')
        .toDate();
    const transaction = await placeOrderTransactionService.start({
        expires: expires,
        object: { passport: { token: req.query.passportToken } },
        seller: { typeOf: seller.typeOf, id: <string>seller.id }
    });

    // 取引セッションを初期化
    const transactionInProgress: Express.ITransactionInProgress = {
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

    const reservationModel = new ReserveSessionModel(transactionInProgress);

    // セッションに購入者情報があれば初期値セット
    const purchaserFromSession = (<Express.Session>req.session).purchaser;
    if (purchaserFromSession !== undefined) {
        reservationModel.transactionInProgress.purchaser = purchaserFromSession;
    }

    return reservationModel;
}

/**
 * 取引開始
 * waiter許可証を持って遷移してくる
 */
export async function start(req: Request, res: Response, next: NextFunction): Promise<void> {
    // 必ずこれらのパラメータを持って遷移してくる
    if (typeof req.query.wc !== 'string' || req.query.wc.length === 0
        || typeof req.query.locale !== 'string' || req.query.locale.length === 0
        || typeof req.query.passportToken !== 'string' || req.query.passportToken.length === 0
    ) {
        res.status(BAD_REQUEST)
            .end('Bad Request');

        return;
    }

    debug('starting reserve...', req.query);
    try {
        // 購入結果セッション初期化
        delete (<Express.Session>req.session).transactionResult;

        const reservationModel = await processStart(req);

        reservationModel.save(req);

        // パフォーマンス選択へ遷移
        res.redirect('/customer/reserve/performances');
    } catch (error) {
        debug('processStart failed.', error);
        if (Number.isInteger(error.code)) {
            if (error.code >= INTERNAL_SERVER_ERROR) {
                // no op
            } else if (error.code >= BAD_REQUEST) {
                res.status(BAD_REQUEST)
                    .end('Bad Request');

                return;
            }
        }

        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * 取引カテゴリーを変更する
 */
export async function changeCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const reservationModel = ReserveSessionModel.FIND(req);
        if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
            res.status(BAD_REQUEST);
            next(new Error(req.__('Expired')));

            return;
        }

        const category = req.params.category;
        if (category !== 'general' && category !== 'wheelchair') {
            res.status(BAD_REQUEST);
            next(new Error(req.__('UnexpectedError')));

            return;
        }

        // カテゴリーを変更してパフォーマンス選択へ遷移
        reservationModel.transactionInProgress.category = category;
        reservationModel.save(req);
        res.redirect('/customer/reserve/performances');
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * スケジュール選択
 */
export async function performances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const reservationModel = ReserveSessionModel.FIND(req);
        if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
            res.status(BAD_REQUEST);
            next(new Error(req.__('Expired')));

            return;
        }

        // クライアントサイドで、パフォーマンス検索にapiのトークンを使用するので
        await authClient.refreshAccessToken();
        const token = authClient.credentials;
        debug('api access token published.');

        const maxDate = moment();
        Object.keys(reserveMaxDateInfo).forEach((key) => {
            maxDate.add((<any>reserveMaxDateInfo)[key], <moment.unitOfTime.DurationConstructor>key);
        });
        const reserveMaxDate: string = maxDate.format('YYYY/MM/DD');

        if (req.method === 'POST') {
            reservePerformanceForm(req);
            const validationResult = await req.getValidationResult();
            if (validationResult.isEmpty()) {
                // パフォーマンスfixして券種選択へ遷移
                await processFixPerformance(reservationModel, req.body.performanceId, req);
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
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * 券種選択
 */
export async function tickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const reservationModel = ReserveSessionModel.FIND(req);
        if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
            res.status(BAD_REQUEST);
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

                    await placeOrderTransactionService.voidSeatReservation({
                        id: actionId,
                        purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: reservationModel.transactionInProgress.id }
                    });
                    debug('seat reservation authorize action canceled.');
                }
            } catch (error) {
                next(error);

                return;
            }

            try {
                // 現在時刻が開始時刻を過ぎている時
                if (moment(reservationModel.transactionInProgress.performance.startDate).toDate() < moment().toDate()) {
                    //「ご希望の枚数が用意できないため予約できません。」
                    throw new Error(req.__('NoAvailableSeats'));
                }

                // 予約処理
                await processFixSeatsAndTickets(reservationModel, req);
                reservationModel.save(req);
                res.redirect('/customer/reserve/profile');

                return;
            } catch (error) {
                // "予約可能な席がございません"などのメッセージ表示
                res.locals.message = error.message;

                // 残席数不足、あるいは車椅子レート制限を超過の場合
                if (error.code === CONFLICT || error.code === TOO_MANY_REQUESTS) {
                    res.locals.message = req.__('NoAvailableSeats');
                }
            }
        }

        // 券種選択画面へ遷移
        res.render('customer/reserve/tickets', {
            reservationModel: reservationModel
        });
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * 購入者情報
 */
// tslint:disable-next-line:max-func-body-length
export async function setProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const reservationModel = ReserveSessionModel.FIND(req);
        if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
            res.status(BAD_REQUEST);
            next(new Error(req.__('Expired')));

            return;
        }

        let gmoError: string = '';

        if (req.method === 'POST') {

            //Form入力値チェック
            const isValid = await isValidProfile(req, res);

            //GMO処理
            if (isValid) {
                try {
                    // 購入者情報FIXプロセス
                    await processFixProfile(reservationModel, req);

                    try {
                        // クレジットカード決済のオーソリ、あるいは、オーダーID発行
                        await processFixGMO(reservationModel, req);
                    } catch (error) {
                        debug('failed in fixing GMO.', error.code, error);
                        if (error.code === BAD_REQUEST) {
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
                } catch (error) {
                    gmoError = error.message;
                }

            }
        } else {
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

        let gmoShopId: string = '';
        // 販売者情報からクレジットカード情報を取り出す
        const paymentAccepted = reservationModel.transactionInProgress.seller.paymentAccepted;
        if (paymentAccepted !== undefined) {
            const creditCardPaymentAccepted = <cinerinoapi.factory.seller.IPaymentAccepted>
                paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
            if (creditCardPaymentAccepted !== undefined) {
                gmoShopId = <string>(<any>creditCardPaymentAccepted).gmoInfo?.shopId;
            }
        }

        res.render('customer/reserve/profile', {
            reservationModel: reservationModel,
            GMO_ENDPOINT: process.env.GMO_ENDPOINT,
            GMO_SHOP_ID: gmoShopId,
            gmoError: gmoError
        });
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * 注文確定
 */
// tslint:disable-next-line:max-func-body-length
export async function confirm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const reservationModel = ReserveSessionModel.FIND(req);
        if (reservationModel === null || moment(reservationModel.transactionInProgress.expires).toDate() <= moment().toDate()) {
            res.status(BAD_REQUEST);
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
                const transactionResult = await placeOrderTransactionService.confirm({
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
                    await orderService.placeOrder({
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
                } catch (error) {
                    // tslint:disable-next-line:no-console
                    console.error(error);
                }

                // 注文承認(リトライも)
                let code: string | undefined;
                let tryCount = 0;
                const MAX_TRY_COUNT = 3;
                while (tryCount < MAX_TRY_COUNT) {
                    try {
                        tryCount += 1;

                        debug('publishing order code...', tryCount);
                        const authorizeOrderResult = await orderService.authorize({
                            object: {
                                orderNumber: order.orderNumber,
                                customer: { telephone: order.customer.telephone }
                            },
                            result: {
                                expiresInSeconds: CODE_EXPIRES_IN_SECONDS
                            }
                        });
                        code = authorizeOrderResult.code;
                        debug('order code published', code);
                        break;
                    } catch (error) {
                        // tslint:disable-next-line:no-console
                        console.error(error);
                    }
                }

                // 購入結果セッション作成
                (<Express.Session>req.session).transactionResult = {
                    ...transactionResult,
                    ...(typeof code === 'string') ? { code } : undefined
                };

                // 購入フローセッションは削除
                ReserveSessionModel.REMOVE(req);

                res.redirect('/customer/reserve/complete');

                return;
            } catch (error) {
                ReserveSessionModel.REMOVE(req);

                // 万が一注文番号が重複すると、ステータスコードCONFLICTが返却される
                if (error.code === CONFLICT) {
                    next(new Error(req.__('CouldNotReserve')));
                } else {
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
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

export function createEmail(
    reservationModel: ReserveSessionModel, req: Request, res: Response
): cinerinoapi.factory.creativeWork.message.email.IAttributes {
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
    return createEmailAttributes(
        event,
        customerProfile,
        price,
        ticketTypes,
        req,
        res
    );
}

/**
 * 予約完了
 */
export async function complete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // セッションに取引結果があるはず
        const transactionResult = (<Express.Session>req.session).transactionResult;
        if (transactionResult === undefined) {
            res.status(NOT_FOUND);
            next(new Error(req.__('NotFound')));

            return;
        }

        const reservations =
            (<cinerinoapi.factory.order.IAcceptedOffer<cinerinoapi.factory.order.IReservation>[]>transactionResult.order.acceptedOffers)
                .map((o) => {
                    const unitPrice = getUnitPriceByAcceptedOffer(o);

                    return {
                        ...o.itemOffered,
                        unitPrice: unitPrice
                    };
                });

        // チケットを券種コードでソート
        sortReservationstByTicketType(reservations);

        res.render('customer/reserve/complete', {
            order: transactionResult.order,
            reservations: reservations,
            ...(typeof transactionResult.code === 'string') ? { code: transactionResult.code } : undefined
        });
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
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
    const tmpReservations = reservationModel.transactionInProgress.authorizeSeatReservationResult?.responseBody.object.subReservation;
    if (Array.isArray(tmpReservations)) {
        reservationModel.transactionInProgress.reservations = tmpReservations.map((tmpReservation) => {
            const ticketType = tmpReservation.reservedTicket.ticketType;

            return {
                reservedTicket: { ticketType: tmpReservation.reservedTicket.ticketType },
                unitPrice: (typeof ticketType.priceSpecification?.price === 'number') ? ticketType.priceSpecification.price : 0
            };
        });
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
    // res.locals.paymentMethod = req.body.paymentMethod;

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
        auth: authClient,
        project: { id: process.env.PROJECT_ID }
    });

    const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: perfomanceId });

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
        return { ...t, count: 0, id: t.identifier };
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
            const unitPriceValue = priceSpecification.priceComponent.find(
                (c) => c.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
            )?.price;
            if (typeof unitPriceValue === 'number') {
                unitPrice = unitPriceValue;
            }
        }
    }

    return unitPrice;
}

/**
 * GMO決済FIXプロセス
 */
async function processFixGMO(reservationModel: ReserveSessionModel, req: Request): Promise<void> {
    reservationModel.save(req);

    reservePaymentCreditForm(req);
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
        throw new Error(req.__('Invalid'));
    }

    // クレジットカードオーソリ取得済であれば取消
    if (reservationModel.transactionInProgress.creditCardAuthorizeActionId !== undefined) {
        debug('canceling credit card authorization...', reservationModel.transactionInProgress.creditCardAuthorizeActionId);
        const actionId = reservationModel.transactionInProgress.creditCardAuthorizeActionId;
        delete reservationModel.transactionInProgress.creditCardAuthorizeActionId;
        await paymentService.voidTransaction({
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

    const gmoTokenObject = JSON.parse(req.body.gmoTokenObject);
    const amount = reservationModel.getTotalCharge();
    debug('authorizing credit card payment...', gmoTokenObject, amount);

    // クレジットカードオーソリ取得
    const action = await paymentService.authorizeCreditCard({
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
}

/**
 * チケットを券種コードでソートする
 */
function sortReservationstByTicketType(reservations: Express.ITmpReservation[]): void {
    reservations.sort((a, b) => {
        // 入塔日
        if ((<string>a.reservedTicket.ticketType.identifier) > (<string>b.reservedTicket.ticketType.identifier)) {
            return 1;
        }
        if ((<string>a.reservedTicket.ticketType.identifier) < (<string>b.reservedTicket.ticketType.identifier)) {
            return -1;
        }

        return 0;
    });
}

/**
 * 取引の確定した注文のチケット印刷
 */
export async function print(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // セッションに取引結果があるはず
        const order = req.session?.transactionResult?.order;
        if (order === undefined) {
            res.status(NOT_FOUND);
            next(new Error(req.__('NotFound')));

            return;
        }

        // POSTで印刷ページへ連携
        res.render('customer/reserve/print', {
            layout: false,
            action: `/reservations/printByOrderNumber?output=a4&locale=${req.session?.locale}`,
            output: 'a4',
            orderNumber: order.orderNumber,
            confirmationNumber: order.confirmationNumber
        });
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}
