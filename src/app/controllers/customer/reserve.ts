/**
 * 予約コントローラー
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as conf from 'config';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, TOO_MANY_REQUESTS } from 'http-status';
import * as jwt from 'jsonwebtoken';
import * as moment from 'moment';
import * as _ from 'underscore';

import reservePaymentCreditForm from '../../forms/reserve/reservePaymentCreditForm';
import reservePerformanceForm from '../../forms/reserve/reservePerformanceForm';
import ReserveSessionModel from '../../models/reserve/session';
import * as reserveBaseController from '../reserveBase';

const debug = createDebug('ttts-frontend:controller:customerReserve');

const reserveMaxDateInfo = conf.get<{ [period: string]: number }>('reserve_max_date');
const reservableEventStartFrom = moment(<string>process.env.RESERVABLE_EVENT_START_FROM).toDate();

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
const paymentService = new cinerinoapi.service.Payment({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: authClient
});

/**
 * 取引開始
 * waiter許可証を持って遷移してくる
 */
export async function start(req: Request, res: Response, next: NextFunction): Promise<void> {
    // 必ずこれらのパラメータを持って遷移してくる
    if (_.isEmpty(req.query.wc) || _.isEmpty(req.query.locale) || _.isEmpty(req.query.passportToken)) {
        res.status(BAD_REQUEST).end('Bad Request');

        return;
    }

    debug('starting reserve...', req.query);
    try {
        // 購入結果セッション初期化
        delete (<Express.Session>req.session).transactionResult;
        delete (<Express.Session>req.session).printToken;

        const reservationModel = await reserveBaseController.processStart(req);

        reservationModel.save(req);

        // パフォーマンス選択へ遷移
        res.redirect('/customer/reserve/performances');
    } catch (error) {
        debug('processStart failed.', error);
        if (Number.isInteger(error.code)) {
            if (error.code >= INTERNAL_SERVER_ERROR) {
                // no op
            } else if (error.code >= BAD_REQUEST) {
                res.status(BAD_REQUEST).end('Bad Request');

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
            maxDate.add(reserveMaxDateInfo[key], <moment.unitOfTime.DurationConstructor>key);
        });
        const reserveMaxDate: string = maxDate.format('YYYY/MM/DD');

        if (req.method === 'POST') {
            reservePerformanceForm(req);
            const validationResult = await req.getValidationResult();
            if (validationResult.isEmpty()) {
                // パフォーマンスfixして券種選択へ遷移
                await reserveBaseController.processFixPerformance(reservationModel, req.body.performanceId, req);
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

        reservationModel.transactionInProgress.paymentMethod = cinerinoapi.factory.paymentMethodType.CreditCard;
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
                    await placeOrderTransactionService.cancelSeatReservationAuthorization({
                        transactionId: reservationModel.transactionInProgress.id,
                        actionId: actionId
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
                await reserveBaseController.processFixSeatsAndTickets(reservationModel, req);
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
export async function profile(req: Request, res: Response, next: NextFunction): Promise<void> {
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
            const isValid = await reserveBaseController.isValidProfile(req, res);

            //GMO処理
            if (isValid) {
                try {
                    // 購入者情報FIXプロセス
                    await reserveBaseController.processFixProfile(reservationModel, req);

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
            res.locals.email = (!_.isEmpty(email)) ? email : '';
            res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
            res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
            res.locals.paymentMethod =
                (!_.isEmpty(reservationModel.transactionInProgress.paymentMethod))
                    ? reservationModel.transactionInProgress.paymentMethod
                    : cinerinoapi.factory.paymentMethodType.CreditCard;
        }

        let gmoShopId: string = '';
        // 販売者情報からクレジットカード情報を取り出す
        const paymentAccepted = reservationModel.transactionInProgress.seller.paymentAccepted;
        if (paymentAccepted !== undefined) {
            const creditCardPaymentAccepted = <cinerinoapi.factory.seller.ICreditCardPaymentAccepted>
                paymentAccepted.find((p) => p.paymentMethodType === cinerinoapi.factory.paymentMethodType.CreditCard);
            if (creditCardPaymentAccepted !== undefined) {
                gmoShopId = creditCardPaymentAccepted.gmoInfo.shopId;
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
 * 予約内容確認
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
                const potentialActions = createPotentialActions(reservationModel);

                // 予約確定
                const transactionResult = await placeOrderTransactionService.confirm({
                    id: reservationModel.transactionInProgress.id,
                    potentialActions: potentialActions
                });
                debug('transacion confirmed. orderNumber:', transactionResult.order.orderNumber);

                // 印刷トークン生成
                const reservationIds =
                    transactionResult.order.acceptedOffers.map((o) => (<cinerinoapi.factory.order.IReservation>o.itemOffered).id);
                const printToken = await createPrintToken(reservationIds);

                // 購入結果セッション作成
                (<Express.Session>req.session).transactionResult = { ...transactionResult, printToken: printToken };

                try {
                    // 完了メールキュー追加(あれば更新日時を更新するだけ)
                    const emailAttributes = await reserveBaseController.createEmailAttributes(
                        transactionResult.order, res
                    );

                    await placeOrderTransactionService.sendEmailNotification({
                        transactionId: reservationModel.transactionInProgress.id,
                        emailMessageAttributes: emailAttributes
                    });
                    debug('email sent.');
                } catch (error) {
                    // 失敗してもスルー
                }

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

/**
 * 印刷トークンインターフェース
 */
export type IPrintToken = string;
/**
 * 印刷トークン対象(予約IDリスト)インターフェース
 */
export type IPrintObject = string[];

/**
 * 予約印刷トークンを発行する
 */
async function createPrintToken(object: IPrintObject): Promise<IPrintToken> {
    return new Promise<IPrintToken>((resolve, reject) => {
        const payload = {
            object: object
        };

        jwt.sign(payload, <string>process.env.TTTS_TOKEN_SECRET, (jwtErr, token) => {
            if (jwtErr instanceof Error) {
                reject(jwtErr);
            } else {
                resolve(token);
            }
        });
    });
}

// tslint:disable-next-line:max-func-body-length
function createPotentialActions(reservationModel: ReserveSessionModel): cinerinoapi.factory.transaction.placeOrder.IPotentialActionsParams {
    // 予約連携パラメータ作成
    const authorizeSeatReservationResult = reservationModel.transactionInProgress.authorizeSeatReservationResult;
    if (authorizeSeatReservationResult === undefined) {
        throw new Error('No Seat Reservation');
    }
    const acceptedOffers = (Array.isArray(authorizeSeatReservationResult.acceptedOffers))
        ? authorizeSeatReservationResult.acceptedOffers
        : [];
    const reserveTransaction = authorizeSeatReservationResult.responseBody;
    if (reserveTransaction === undefined) {
        throw new cinerinoapi.factory.errors.Argument('Transaction', 'Reserve trasaction required');
    }
    const chevreReservations = (Array.isArray(reserveTransaction.object.reservations))
        ? reserveTransaction.object.reservations
        : [];
    const event = reserveTransaction.object.reservationFor;
    if (event === undefined || event === null) {
        throw new cinerinoapi.factory.errors.Argument('Transaction', 'Event required');
    }

    let paymentNo: string | undefined;
    if (chevreReservations[0].underName !== undefined && Array.isArray(chevreReservations[0].underName.identifier)) {
        const paymentNoProperty = chevreReservations[0].underName.identifier.find((p) => p.name === 'paymentNo');
        if (paymentNoProperty !== undefined) {
            paymentNo = paymentNoProperty.value;
        }
    }

    const transactionAgent = reservationModel.transactionInProgress.agent;
    if (transactionAgent === undefined) {
        throw new Error('No Transaction Agent');
    }

    const customerProfile = reservationModel.transactionInProgress.profile;
    if (customerProfile === undefined) {
        throw new Error('No Customer Profile');
    }

    // 予約確定パラメータを生成
    const eventReservations = acceptedOffers.map((acceptedOffer, index) => {
        const reservation = acceptedOffer.itemOffered;

        const chevreReservation = chevreReservations.find((r) => r.id === reservation.id);
        if (chevreReservation === undefined) {
            throw new cinerinoapi.factory.errors.Argument('Transaction', `Unexpected temporary reservation: ${reservation.id}`);
        }

        return temporaryReservation2confirmed({
            reservation: reservation,
            chevreReservation: chevreReservation,
            transactionId: reservationModel.transactionInProgress.id,
            customer: transactionAgent,
            profile: customerProfile,
            paymentNo: <string>paymentNo,
            gmoOrderId: <string>reservationModel.transactionInProgress.paymentMethodId,
            paymentSeatIndex: index.toString(),
            paymentMethodName: reservationModel.transactionInProgress.paymentMethod
        });
    });

    const confirmReservationParams: cinerinoapi.factory.transaction.placeOrder.IConfirmReservationParams[] = [];
    confirmReservationParams.push({
        object: {
            typeOf: reserveTransaction.typeOf,
            id: reserveTransaction.id,
            object: {
                reservations: [
                    ...eventReservations.map((r) => {
                        // プロジェクト固有の値を連携
                        return {
                            id: r.id,
                            additionalTicketText: r.additionalTicketText,
                            underName: r.underName,
                            additionalProperty: r.additionalProperty
                        };
                    }),
                    // 余分確保分の予約にもextraプロパティを連携
                    ...chevreReservations.filter((r) => {
                        // 注文アイテムに存在しない予約(余分確保分)にフィルタリング
                        const orderItem = eventReservations.find(
                            (eventReservation) => eventReservation.id === r.id
                        );

                        return orderItem === undefined;
                    })
                        .map((r) => {
                            return {
                                id: r.id,
                                additionalProperty: [
                                    { name: 'extra', value: '1' }
                                ]
                            };
                        })
                ]
            }
        }
    });

    return {
        order: {
            potentialActions: {
                sendOrder: {
                    potentialActions: {
                        confirmReservation: confirmReservationParams
                    }
                },
                informOrder: [
                    { recipient: { url: `${<string>process.env.API_ENDPOINT}/webhooks/onPlaceOrder` } }
                ]
            }
        }
    };
}

/**
 * 仮予約から確定予約を生成する
 */
function temporaryReservation2confirmed(params: {
    reservation: cinerinoapi.factory.order.IReservation;
    chevreReservation: cinerinoapi.factory.chevre.reservation.IReservation<cinerinoapi.factory.chevre.reservationType.EventReservation>;
    transactionId: string;
    customer: cinerinoapi.factory.transaction.placeOrder.IAgent;
    profile: cinerinoapi.factory.person.IProfile;
    paymentNo: string;
    gmoOrderId: string;
    paymentSeatIndex: string;
    paymentMethodName: string;
}): cinerinoapi.factory.chevre.reservation.IReservation<cinerinoapi.factory.chevre.reservationType.EventReservation> {
    const customer = params.customer;

    const underName: cinerinoapi.factory.chevre.reservation.IUnderName<cinerinoapi.factory.chevre.reservationType.EventReservation> = {
        ...params.profile,
        typeOf: cinerinoapi.factory.personType.Person,
        id: customer.id,
        name: `${params.profile.givenName} ${params.profile.familyName}`,
        identifier: [
            { name: 'customerGroup', value: 'Customer' },
            { name: 'paymentNo', value: params.paymentNo },
            { name: 'transaction', value: params.transactionId },
            { name: 'gmoOrderId', value: params.gmoOrderId },
            ...(typeof params.profile.age === 'string')
                ? [{ name: 'age', value: params.profile.age }]
                : [],
            ...(Array.isArray(customer.identifier)) ? customer.identifier : [],
            ...(customer.memberOf !== undefined && customer.memberOf.membershipNumber !== undefined)
                ? [{ name: 'username', value: customer.memberOf.membershipNumber }]
                : [],
            ...(params.paymentMethodName !== undefined)
                ? [{ name: 'paymentMethod', value: params.paymentMethodName }]
                : []
        ]
    };

    return {
        ...params.chevreReservation,
        underName: underName,
        additionalProperty: [
            ...(Array.isArray(params.reservation.additionalProperty)) ? params.reservation.additionalProperty : [],
            { name: 'paymentSeatIndex', value: params.paymentSeatIndex }
        ],
        additionalTicketText: params.reservation.additionalTicketText
    };
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

        const reservations = transactionResult.order.acceptedOffers.map((o) => {
            const unitPrice = reserveBaseController.getUnitPriceByAcceptedOffer(o);

            return {
                ...<cinerinoapi.factory.order.IReservation>o.itemOffered,
                unitPrice: unitPrice
            };
        });

        // チケットを券種コードでソート
        sortReservationstByTicketType(reservations);

        res.render('customer/reserve/complete', {
            order: transactionResult.order,
            reservations: reservations,
            printToken: (<any>transactionResult).printToken
        });
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * GMO決済FIXプロセス
 */
async function processFixGMO(reservationModel: ReserveSessionModel, req: Request): Promise<void> {
    // パフォーマンスは指定済みのはず
    if (reservationModel.transactionInProgress.performance === undefined) {
        throw new Error(req.__('UnexpectedError'));
    }

    // GMOリクエスト前にカウントアップ
    reservationModel.transactionInProgress.transactionGMO.count += 1;
    reservationModel.save(req);

    switch (reservationModel.transactionInProgress.paymentMethod) {
        case cinerinoapi.factory.paymentMethodType.CreditCard:
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

            // クレジットカードオーソリ取得
            debug('creating credit card authorizeAction...');
            const action = await paymentService.authorizeCreditCard({
                object: {
                    typeOf: cinerinoapi.factory.paymentMethodType.CreditCard,
                    amount: amount,
                    // tslint:disable-next-line:no-suspicious-comment
                    method: <any>'1', // TODO 定数化
                    creditCard: gmoTokenObject
                },
                purpose: {
                    typeOf: cinerinoapi.factory.transactionType.PlaceOrder,
                    id: reservationModel.transactionInProgress.id
                }
            });
            debug('credit card authorizeAction created.', action.id);
            reservationModel.transactionInProgress.creditCardAuthorizeActionId = action.id;
            reservationModel.transactionInProgress.paymentMethodId = action.object.paymentMethodId;
            reservationModel.transactionInProgress.transactionGMO.amount = amount;

            break;

        default:
    }
}

/**
 * チケットを券種コードでソートする
 */
function sortReservationstByTicketType(reservations: Express.ITmpReservation[]): void {
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
