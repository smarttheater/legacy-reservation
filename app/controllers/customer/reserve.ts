/**
 * 一般座席予約コントローラー
 * @namespace controller.customer.reserve
 */

import * as tttsapi from '@motionpicture/ttts-api-nodejs-client';
import * as conf from 'config';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST, CONFLICT, INTERNAL_SERVER_ERROR, NOT_FOUND, TOO_MANY_REQUESTS } from 'http-status';
import * as moment from 'moment';
import * as _ from 'underscore';

import reservePaymentCreditForm from '../../forms/reserve/reservePaymentCreditForm';
import reservePerformanceForm from '../../forms/reserve/reservePerformanceForm';
import ReserveSessionModel from '../../models/reserve/session';
import * as reserveBaseController from '../reserveBase';

const debug = createDebug('ttts-frontend:controller:customerReserve');
const PURCHASER_GROUP: string = tttsapi.factory.person.Group.Customer;
const reserveMaxDateInfo = conf.get<{ [period: string]: number }>('reserve_max_date');
const reservableEventStartFrom = moment(<string>process.env.RESERVABLE_EVENT_START_FROM).toDate();

const authClient = new tttsapi.auth.ClientCredentials({
    domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.API_CLIENT_ID,
    clientSecret: <string>process.env.API_CLIENT_SECRET,
    scopes: [
        `${<string>process.env.API_RESOURECE_SERVER_IDENTIFIER}/performances.read-only`,
        `${<string>process.env.API_RESOURECE_SERVER_IDENTIFIER}/transactions`
    ],
    state: ''
});

const placeOrderTransactionService = new tttsapi.service.transaction.PlaceOrder({
    endpoint: <string>process.env.API_ENDPOINT,
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
    // MPのIPは許可
    const ip = <string | undefined>req.headers['x-forwarded-for'];
    const regex = /^124\.155\.113\.9$/;
    if (ip !== undefined && regex.test(ip)) {
        // no op
    } else {
        // 期限指定
        if (moment() < moment(conf.get<string>('datetimes.reservation_start_customers_first'))) {
            if (!_.isEmpty(req.query.locale)) {
                req.setLocale(req.query.locale);
            }

            res.status(BAD_REQUEST);
            next(new Error(req.__('Message.OutOfTerm')));

            return;
        }

        // 2次販売10分前より閉める
        if (moment() < moment(conf.get<string>('datetimes.reservation_start_customers_second')) &&
            // tslint:disable-next-line:no-magic-numbers
            moment() > moment(conf.get<string>('datetimes.reservation_start_customers_second')).add(-15, 'minutes')
        ) {
            if (!_.isEmpty(req.query.locale)) {
                req.setLocale(req.query.locale);
            }

            res.status(BAD_REQUEST);
            next(new Error(req.__('Message.OutOfTerm')));

            return;
        }
    }

    try {
        // 購入結果セッション初期化
        delete (<Express.Session>req.session).transactionResult;
        delete (<Express.Session>req.session).printToken;

        const reservationModel = await reserveBaseController.processStart(PURCHASER_GROUP, req);

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
 * スケジュール選択
 * @method performances
 * @returns {Promise<void>}
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
        debug('tttsapi access token published.');

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
                if (moment(reservationModel.transactionInProgress.performance.start_date).toDate() < moment().toDate()) {
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
            try {
                // 購入者情報FIXプロセス
                await reserveBaseController.processFixProfile(reservationModel, req, res);

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
                    : tttsapi.factory.paymentMethodType.CreditCard;
        }

        res.render('customer/reserve/profile', {
            reservationModel: reservationModel,
            GMO_ENDPOINT: process.env.GMO_ENDPOINT,
            GMO_SHOP_ID: reservationModel.transactionInProgress.seller.gmoInfo.shopId,
            gmoError: gmoError
        });
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * 予約内容確認
 */
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
                // 予約確定
                const transactionResult = await placeOrderTransactionService.confirm({
                    transactionId: reservationModel.transactionInProgress.id,
                    paymentMethod: reservationModel.transactionInProgress.paymentMethod
                });
                debug('transacion confirmed. orderNumber:', transactionResult.order.orderNumber);

                // 購入結果セッション作成
                (<Express.Session>req.session).transactionResult = transactionResult;

                try {
                    // 完了メールキュー追加(あれば更新日時を更新するだけ)
                    const emailAttributes = await reserveBaseController.createEmailAttributes(
                        transactionResult.eventReservations, reservationModel.getTotalCharge(), res
                    );

                    await placeOrderTransactionService.sendEmailNotification({
                        transactionId: reservationModel.transactionInProgress.id,
                        emailMessageAttributes: emailAttributes
                    });
                    debug('email sent.');
                } catch (error) {
                    // 失敗してもスルー
                }

                //　購入フローセッションは削除
                ReserveSessionModel.REMOVE(req);

                res.redirect('/customer/reserve/complete');

                return;
            } catch (error) {
                ReserveSessionModel.REMOVE(req);
                next(error);

                return;
            }
        }

        // チケットをticket_type(id)でソート
        sortReservationstByTicketType(reservationModel.transactionInProgress.reservations);
        res.render('customer/reserve/confirm', {
            reservationModel: reservationModel
        });
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
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

        let reservations = transactionResult.eventReservations;
        debug(reservations.length, 'reservation(s) found.');
        reservations = reservations.filter((r) => r.status === tttsapi.factory.reservationStatusType.ReservationConfirmed);
        // チケットをticket_type(id)でソート
        sortReservationstByTicketType(reservations);

        res.render('customer/reserve/complete', {
            reservations: reservations,
            printToken: transactionResult.printToken
        });
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * GMO決済FIXプロセス
 * @param {ReserveSessionModel} reservationModel
 * @returns {Promise<void>}
 */
async function processFixGMO(reservationModel: ReserveSessionModel, req: Request): Promise<void> {
    const DIGIT_OF_SERIAL_NUMBER_IN_ORDER_ID = -2;
    let orderId: string;

    // パフォーマンスは指定済みのはず
    if (reservationModel.transactionInProgress.performance === undefined) {
        throw new Error(req.__('UnexpectedError'));
    }

    // GMOリクエスト前にカウントアップ
    reservationModel.transactionInProgress.transactionGMO.count += 1;
    reservationModel.save(req);

    switch (reservationModel.transactionInProgress.paymentMethod) {
        case tttsapi.factory.paymentMethodType.CreditCard:
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
                await placeOrderTransactionService.cancelCreditCardAuthorization({
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
            const action = await placeOrderTransactionService.createCreditCardAuthorization({
                transactionId: reservationModel.transactionInProgress.id,
                orderId: orderId,
                amount: amount,
                // tslint:disable-next-line:no-suspicious-comment
                method: '1', // TODO 定数化
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
}

type IReservation = tttsapi.factory.action.authorize.seatReservation.ITmpReservation |
    tttsapi.factory.reservation.event.IReservation;

/**
 * チケットをticket_type(id)でソートする
 * @function
 */
function sortReservationstByTicketType(reservations: IReservation[]): void {
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
