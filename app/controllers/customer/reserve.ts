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
        // tslint:disable-next-line:no-magic-numbers
        //const reserveMaxDate: string = moment().add(reserveMaxDateInfo.type, reserveMaxDateInfo.value).format('YYYY/MM/DD');
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
                // FilmUtil: ttts.FilmUtil,
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
        const reservationModel = await reserveBaseController.processStart(PURCHASER_GROUP, req);

        if (reservationModel.performance !== undefined) {
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
        if (reservationModel === null) {
            next(new Error(req.__('Expired')));

            return;
        }
        reservationModel.paymentMethod = <any>'';
        if (req.method === 'POST') {
            // 仮予約あればキャンセルする
            try {
                await reserveBaseController.processCancelSeats(reservationModel);
            } catch (error) {
                next(error);

                return;
            }
            try {
                // 現在時刻が開始時刻を過ぎている時
                const now = moment().format('YYYYMMDD HHmm');
                const dayTime = `${reservationModel.performance.day} ${reservationModel.performance.start_time}`;
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

        if (reservationModel === null) {
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
                        // errMsg = e.errors[0].userMessage
                        switch (e.errors[0].code) {
                            case 'E92':
                                errMsg = '只今、大変込み合っていますので、しばらく時間をあけて再度決済を行ってください。';
                                break;
                            case 'G02':
                                errMsg = 'カード残高が不足しているために、決済を完了する事が出来ませんでした。';
                                break;
                            case 'G03':
                                errMsg = 'カード限度額を超えているために、決済を完了する事が出来ませんでした。';
                                break;
                            case 'G04':
                                errMsg = 'カード残高が不足しているために、決済を完了する事が出来ませんでした。';
                                break;
                            case 'G05':
                                errMsg = 'カード限度額を超えているために、決済を完了する事が出来ませんでした。';
                                break;
                            default:
                                errMsg = 'このカードでは取引をする事が出来ません。';
                                break;
                        }
                        res.render('customer/reserve/profile', {
                            reservationModel: reservationModel,
                            GMO_ENDPOINT: conf.get<string>('gmo_payment_endpoint'),
                            GMO_SHOP_ID: reservationModel.seller.gmoInfo.shopId,
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
                    GMO_SHOP_ID: reservationModel.seller.gmoInfo.shopId
                });
            }
        } else {
            // セッションに情報があれば、フォーム初期値設定
            const email = reservationModel.purchaser.email;
            res.locals.lastName = reservationModel.purchaser.lastName;
            res.locals.firstName = reservationModel.purchaser.firstName;
            res.locals.tel = reservationModel.purchaser.tel;
            res.locals.age = reservationModel.purchaser.age;
            res.locals.address = reservationModel.purchaser.address;
            res.locals.gender = reservationModel.purchaser.gender;
            res.locals.email = (!_.isEmpty(email)) ? email : '';
            res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
            res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
            res.locals.paymentMethod =
                (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : ttts.GMO.utils.util.PayType.Credit;

            res.render('customer/reserve/profile', {
                reservationModel: reservationModel,
                GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                GMO_SHOP_ID: reservationModel.seller.gmoInfo.shopId
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

        if (reservationModel === null) {
            next(new Error(req.__('Expired')));

            return;
        }

        if (req.method === 'POST') {
            try {
                // 取引期限チェック
                if (reservationModel.expires <= moment().toDate()) {
                    throw new Error(req.__('Expired'));
                }

                // 予約確定
                const transactionResult = await ttts.service.transaction.placeOrderInProgress.confirm({
                    agentId: reservationModel.agentId,
                    transactionId: reservationModel.id,
                    paymentMethod: reservationModel.paymentMethod
                })(
                    new ttts.repository.Transaction(ttts.mongoose.connection),
                    new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection),
                    new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection)
                    );
                debug('transacion confirmed. orderNumber:', transactionResult.order.orderNumber);

                try {
                    // 完了メールキュー追加(あれば更新日時を更新するだけ)
                    const emailQueue = await reserveBaseController.createEmailQueue(
                        transactionResult.eventReservations, reservationModel, res
                    );
                    await ttts.Models.EmailQueue.create(emailQueue);
                    debug('email queue created.');
                } catch (error) {
                    // 失敗してもスルー
                }

                //　購入フローセッションは削除
                ReserveSessionModel.REMOVE(req);

                // 購入結果セッション作成
                (<Express.Session>req.session).transactionResult = transactionResult;

                res.redirect(`/customer/reserve/${reservationModel.performance.day}/${reservationModel.paymentNo}/complete`);

                return;
            } catch (error) {
                ReserveSessionModel.REMOVE(req);
                next(error);
            }
        }

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
        reservations.sort((a, b) => ttts.factory.place.screen.sortBySeatCode(a.seat_code, b.seat_code));

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

    if (reservationModel.transactionGMO === undefined) {
        reservationModel.transactionGMO = {
            orderId: '',
            amount: 0,
            count: 0,
            status: ttts.GMO.utils.util.Status.Unprocessed
        };
    }

    // GMOリクエスト前にカウントアップ
    reservationModel.transactionGMO.count += 1;
    reservationModel.save(req);

    switch (reservationModel.paymentMethod) {
        case ttts.factory.paymentMethodType.CreditCard:
            reservePaymentCreditForm(req);
            const validationResult = await req.getValidationResult();
            if (!validationResult.isEmpty()) {
                throw new Error(req.__('Invalid"'));
            }

            // クレジットカードオーソリ取得済であれば取消
            if (reservationModel.creditCardAuthorizeActionId !== undefined) {
                debug('canceling credit card authorization...', reservationModel.creditCardAuthorizeActionId);
                const actionId = reservationModel.creditCardAuthorizeActionId;
                delete reservationModel.creditCardAuthorizeActionId;
                await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
                    reservationModel.agentId,
                    reservationModel.id,
                    actionId
                )(
                    new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection),
                    new ttts.repository.Transaction(ttts.mongoose.connection)
                    );
                debug('credit card authorization canceled.');
            }

            // GMO取引作成
            const count = `00${reservationModel.transactionGMO.count}`.slice(DIGIT_OF_SERIAL_NUMBER_IN_ORDER_ID);
            // オーダーID 予約日 + 上映日 + 購入番号 + オーソリカウント(2桁)
            orderId = `${moment().format('YYMMDD')}${reservationModel.performance.day}${reservationModel.paymentNo}${count}`;
            debug('orderId:', orderId);

            const gmoTokenObject = JSON.parse(req.body.gmoTokenObject);
            const amount = reservationModel.getTotalCharge();

            // クレジットカードオーソリ取得
            debug('creating credit card authorizeAction...', orderId);
            const action = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
                reservationModel.agentId,
                reservationModel.id,
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
            reservationModel.creditCardAuthorizeActionId = action.id;

            reservationModel.transactionGMO.orderId = orderId;
            reservationModel.transactionGMO.amount = amount;
            reservationModel.transactionGMO.status = ttts.GMO.utils.util.Status.Auth;

            break;

        default:
            break;
    }
}
