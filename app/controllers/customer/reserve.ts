/**
 * 一般座席予約コントローラー
 * @namespace controller/customer/reserve
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
//import * as httpStatus from 'http-status';
import * as moment from 'moment';
import * as _ from 'underscore';

import reservePaymentCreditForm from '../../forms/reserve/reservePaymentCreditForm';
import reservePerformanceForm from '../../forms/reserve/reservePerformanceForm';
import ReserveSessionModel from '../../models/reserve/session';
import * as reserveBaseController from '../reserveBase';

const debug = createDebug('ttts-frontend:controller:customerReserve');
const PURCHASER_GROUP: string = ttts.factory.person.Group.Customer;
const reserveMaxDateInfo: any = conf.get<any>('reserve_max_date');

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

/**
 * スケジュール選択(本番では存在しない、実際はポータル側のページ)
 * @method performances
 * @returns {Promise<void>}
 */
export async function performances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const token = await ttts.CommonUtil.getToken({
            authorizeServerDomain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
            clientId: <string>process.env.API_CLIENT_ID,
            clientSecret: <string>process.env.API_CLIENT_SECRET,
            scopes: [
                `${<string>process.env.API_RESOURECE_SERVER_IDENTIFIER}/performances.read-only`
            ],
            state: ''
        });

        const maxDate = moment();
        Object.keys(reserveMaxDateInfo).forEach((key: any) => {
            maxDate.add(key, reserveMaxDateInfo[key]);
        });
        const reserveMaxDate: string = maxDate.format('YYYY/MM/DD');

        if (req.method === 'POST') {
            reservePerformanceForm(req);
            const validationResult = await req.getValidationResult();
            if (!validationResult.isEmpty()) {
                res.render('customer/reserve/performances');

                return;
            }
            const performaceId = req.body.performanceId;
            const category = req.body.category;
            res.redirect(`/customer/reserve/start?performance=${performaceId}&locale=${req.getLocale()}&category=${category}`);

            return;
        } else {
            const category: string = req.params.category;
            res.render('customer/reserve/performances', {
                token: token,
                reserveMaxDate: reserveMaxDate,
                category: category
            });
        }
    } catch (error) {
        next(new Error(req.__('UnexpectedError')));
    }
}

/**
 * ポータルからパフォーマンスと言語指定で遷移してくる
 */
export async function start(req: Request, res: Response, next: NextFunction): Promise<void> {
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

            next(new Error(req.__('Message.OutOfTerm')));

            return;
        }
    }

    try {
        // 購入結果セッション初期化
        delete (<Express.Session>req.session).transactionResult;
        delete (<Express.Session>req.session).printToken;

        const reservationModel = await reserveBaseController.processStart(PURCHASER_GROUP, req);

        if (reservationModel.transactionInProgress.performance !== undefined) {
            reservationModel.save(req);
            //2017/05/11 座席選択削除
            //res.redirect('/customer/reserve/terms');
            res.redirect('/customer/reserve/tickets');
            //---
        } else {
            // 今回は必ずパフォーマンス指定で遷移してくるはず
            next(new Error(req.__('UnexpectedError')));
            // reservationModel.save(() => {
            //     res.redirect('/customer/reserve/performances');
            // });
        }
    } catch (error) {
        console.error(error);
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
            next(new Error(req.__('Expired')));

            return;
        }
        debug(reservationModel.transactionInProgress.expires, moment().toDate());
        debug(typeof reservationModel.transactionInProgress.expires);
        debug(typeof moment().toDate());

        reservationModel.transactionInProgress.paymentMethod = ttts.factory.paymentMethodType.CreditCard;

        if (req.method === 'POST') {
            // 仮予約あればキャンセルする
            try {
                // セッション中の予約リストを初期化
                reservationModel.transactionInProgress.reservations = [];

                // 座席仮予約があればキャンセル
                if (reservationModel.transactionInProgress.seatReservationAuthorizeActionId !== undefined) {
                    await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(
                        reservationModel.transactionInProgress.agentId,
                        reservationModel.transactionInProgress.id,
                        reservationModel.transactionInProgress.seatReservationAuthorizeActionId
                    )(
                        new ttts.repository.Transaction(ttts.mongoose.connection),
                        new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection),
                        new ttts.repository.rateLimit.TicketTypeCategory(redisClient)
                        );
                }
            } catch (error) {
                next(error);

                return;
            }

            try {
                // 現在時刻が開始時刻を過ぎている時
                const now = moment().format('YYYYMMDD HHmm');
                // tslint:disable-next-line:max-line-length
                const dayTime = `${reservationModel.transactionInProgress.performance.day} ${reservationModel.transactionInProgress.performance.start_time}`;
                if (now > dayTime) {
                    //「ご希望の枚数が用意できないため予約できません。」
                    throw new Error(req.__('NoAvailableSeats'));
                }
                // 予約処理
                await reserveBaseController.processFixSeatsAndTickets(reservationModel, req);
                reservationModel.save(req);
                res.redirect('/customer/reserve/profile');
            } catch (error) {
                // "予約可能な席がございません"などのメッセージ表示
                res.locals.message = error.message;

                // 車椅子レート制限を超過した場合
                if (error instanceof ttts.factory.errors.RateLimitExceeded) {
                    res.locals.message = req.__('NoAvailableSeats');
                }

                res.render('customer/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        } else {
            // 券種選択画面へ遷移
            res.locals.message = '';
            res.render('customer/reserve/tickets', {
                reservationModel: reservationModel
            });
        }
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
            next(new Error(req.__('Expired')));

            return;
        }

        if (req.method === 'POST') {
            try {
                // 購入者情報FIXプロセス
                await reserveBaseController.processFixProfile(reservationModel, req, res);
                try {
                    // クレジットカード決済のオーソリ、あるいは、オーダーID発行
                    await processFixGMO(reservationModel, req);
                } catch (e) {
                    // tslint:disable-next-line:no-console
                    console.log(e);
                    if (e.errors) {
                        let errMsg;
                        switch (e.errors[0].code) {
                            case 'E92':
                                // "只今、大変込み合っていますので、しばらく時間をあけて再度決済を行ってください。"
                                errMsg = req.__('TransactionBusy');
                                break;
                            case 'G02':
                                // "カード残高が不足しているために、決済を完了する事が出来ませんでした。"
                                errMsg = req.__('InsufficientCard');
                                break;
                            case 'G03':
                                // "カード限度額を超えているために、決済を完了する事が出来ませんでした。"
                                errMsg = req.__('MaxedCard');
                                break;
                            case 'G04':
                                // "カード残高が不足しているために、決済を完了する事が出来ませんでした。"
                                errMsg = req.__('InsufficientCard');
                                break;
                            case 'G05':
                                // "カード限度額を超えているために、決済を完了する事が出来ませんでした。"
                                errMsg = req.__('MaxedCard');
                                break;
                            default:
                                // "このカードでは取引をする事が出来ません。"
                                errMsg = req.__('BadCard');
                                break;
                        }
                        res.render('customer/reserve/profile', {
                            reservationModel: reservationModel,
                            GMO_ENDPOINT: conf.get<string>('gmo_payment_endpoint'),
                            GMO_SHOP_ID: reservationModel.transactionInProgress.seller.gmoInfo.shopId,
                            GMOERROR: errMsg
                        });

                        return;
                    } else {
                        // GMO以外のエラーはガチエラー
                        next(new Error(req.__('UnexpectedError')));

                        return;
                    }
                }
                reservationModel.save(req);
                res.redirect('/customer/reserve/confirm');
            } catch (error) {
                res.render('customer/reserve/profile', {
                    reservationModel: reservationModel,
                    GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                    GMO_SHOP_ID: reservationModel.transactionInProgress.seller.gmoInfo.shopId
                });
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
                    : ttts.GMO.utils.util.PayType.Credit;

            res.render('customer/reserve/profile', {
                reservationModel: reservationModel,
                GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                GMO_SHOP_ID: reservationModel.transactionInProgress.seller.gmoInfo.shopId
            });
        }
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
            next(new Error(req.__('Expired')));

            return;
        }

        if (req.method === 'POST') {
            try {
                const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
                const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
                const creditCardAuthorizeActionRepo = new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection);
                const seatReservationAuthorizeActionRepo = new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection);

                // 予約確定
                const transactionResult = await ttts.service.transaction.placeOrderInProgress.confirm({
                    agentId: reservationModel.transactionInProgress.agentId,
                    transactionId: reservationModel.transactionInProgress.id,
                    paymentMethod: reservationModel.transactionInProgress.paymentMethod
                })(transactionRepo, creditCardAuthorizeActionRepo, seatReservationAuthorizeActionRepo);
                debug('transacion confirmed. orderNumber:', transactionResult.order.orderNumber);

                // 購入結果セッション作成
                (<Express.Session>req.session).transactionResult = transactionResult;

                try {
                    // 完了メールキュー追加(あれば更新日時を更新するだけ)
                    const emailAttributes = await reserveBaseController.createEmailAttributes(
                        transactionResult.eventReservations, reservationModel.getTotalCharge(), res
                    );

                    await ttts.service.transaction.placeOrder.sendEmail(
                        reservationModel.transactionInProgress.id,
                        emailAttributes
                    )(taskRepo, transactionRepo);
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
            next(new Error(req.__('NotFound')));

            return;
        }

        let reservations = (<ttts.factory.transaction.placeOrder.IResult>transactionResult).eventReservations;
        debug(reservations.length, 'reservation(s) found.');
        reservations = reservations.filter((r) => r.status === ttts.factory.reservationStatusType.ReservationConfirmed);
        // チケットをticket_type(id)でソート
        sortReservationstByTicketType(reservations);

        // 初めてのアクセスであれば印刷トークン発行
        if ((<Express.Session>req.session).printToken === undefined) {
            const tokenRepo = new ttts.repository.Token(redisClient);
            const printToken = await tokenRepo.createPrintToken(reservations.map((r) => r.id));
            debug('printToken created.', printToken);
            (<Express.Session>req.session).printToken = printToken;
        }

        res.render('customer/reserve/complete', {
            reservations: reservations,
            printToken: (<Express.Session>req.session).printToken
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

    if (reservationModel.transactionInProgress.transactionGMO === undefined) {
        reservationModel.transactionInProgress.transactionGMO = {
            orderId: '',
            amount: 0,
            count: 0,
            status: ttts.GMO.utils.util.Status.Unprocessed
        };
    }

    // GMOリクエスト前にカウントアップ
    reservationModel.transactionInProgress.transactionGMO.count += 1;
    reservationModel.save(req);

    switch (reservationModel.transactionInProgress.paymentMethod) {
        case ttts.factory.paymentMethodType.CreditCard:
            reservePaymentCreditForm(req);
            const validationResult = await req.getValidationResult();
            if (!validationResult.isEmpty()) {
                throw new Error(req.__('Invalid"'));
            }

            // クレジットカードオーソリ取得済であれば取消
            if (reservationModel.transactionInProgress.creditCardAuthorizeActionId !== undefined) {
                debug('canceling credit card authorization...', reservationModel.transactionInProgress.creditCardAuthorizeActionId);
                const actionId = reservationModel.transactionInProgress.creditCardAuthorizeActionId;
                delete reservationModel.transactionInProgress.creditCardAuthorizeActionId;
                await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
                    reservationModel.transactionInProgress.agentId,
                    reservationModel.transactionInProgress.id,
                    actionId
                )(
                    new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection),
                    new ttts.repository.Transaction(ttts.mongoose.connection)
                    );
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
            const action = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
                reservationModel.transactionInProgress.agentId,
                reservationModel.transactionInProgress.id,
                orderId,
                amount,
                ttts.GMO.utils.util.Method.Lump, // 支払い方法は一括
                gmoTokenObject
            )(
                new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection),
                new ttts.repository.Organization(ttts.mongoose.connection),
                new ttts.repository.Transaction(ttts.mongoose.connection)
                );
            debug('credit card authorizeAction created.', action.id);
            reservationModel.transactionInProgress.creditCardAuthorizeActionId = action.id;

            reservationModel.transactionInProgress.transactionGMO.orderId = orderId;
            reservationModel.transactionInProgress.transactionGMO.amount = amount;
            reservationModel.transactionInProgress.transactionGMO.status = ttts.GMO.utils.util.Status.Auth;

            break;

        default:
            break;
    }
}
/**
 * チケットをticket_type(id)でソートする
 * @method sortReservationstByTicketType
 */
function sortReservationstByTicketType(reservations: any[]): void {
    // チケットをticket_type(id)でソート
    reservations.sort((a: any, b: any) => {
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
