"use strict";
/**
 * 一般座席予約コントローラー
 * @namespace controller/customer/reserve
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const conf = require("config");
const createDebug = require("debug");
//import * as httpStatus from 'http-status';
const moment = require("moment");
const _ = require("underscore");
const reservePaymentCreditForm_1 = require("../../forms/reserve/reservePaymentCreditForm");
const reservePerformanceForm_1 = require("../../forms/reserve/reservePerformanceForm");
const session_1 = require("../../models/reserve/session");
const reserveBaseController = require("../reserveBase");
const debug = createDebug('ttts-frontend:controller:customerReserve');
const PURCHASER_GROUP = ttts.factory.person.Group.Customer;
const reserveMaxDateInfo = conf.get('reserve_max_date');
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
/**
 * スケジュール選択(本番では存在しない、実際はポータル側のページ)
 * @method performances
 * @returns {Promise<void>}
 */
function performances(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const token = yield ttts.CommonUtil.getToken({
                authorizeServerDomain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
                clientId: process.env.API_CLIENT_ID,
                clientSecret: process.env.API_CLIENT_SECRET,
                scopes: [
                    `${process.env.API_RESOURECE_SERVER_IDENTIFIER}/performances.read-only`
                ],
                state: ''
            });
            // tslint:disable-next-line:no-magic-numbers
            //const reserveMaxDate: string = moment().add(reserveMaxDateInfo.type, reserveMaxDateInfo.value).format('YYYY/MM/DD');
            const maxDate = moment();
            Object.keys(reserveMaxDateInfo).forEach((key) => {
                maxDate.add(key, reserveMaxDateInfo[key]);
            });
            const reserveMaxDate = maxDate.format('YYYY/MM/DD');
            if (req.method === 'POST') {
                reservePerformanceForm_1.default(req);
                const validationResult = yield req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    res.render('customer/reserve/performances');
                    return;
                }
                const performaceId = req.body.performanceId;
                const category = req.body.category;
                res.redirect(`/customer/reserve/start?performance=${performaceId}&locale=${req.getLocale()}&category=${category}`);
                return;
            }
            else {
                const category = req.params.category;
                res.render('customer/reserve/performances', {
                    // FilmUtil: ttts.FilmUtil,
                    token: token,
                    reserveMaxDate: reserveMaxDate,
                    category: category
                });
            }
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.performances = performances;
/**
 * ポータルからパフォーマンスと言語指定で遷移してくる
 */
function start(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // MPのIPは許可
        const ip = req.headers['x-forwarded-for'];
        const regex = /^124\.155\.113\.9$/;
        if (ip !== undefined && regex.test(ip)) {
            // no op
        }
        else {
            // 期限指定
            if (moment() < moment(conf.get('datetimes.reservation_start_customers_first'))) {
                if (!_.isEmpty(req.query.locale)) {
                    req.setLocale(req.query.locale);
                }
                next(new Error(req.__('Message.OutOfTerm')));
                return;
            }
            // 2次販売10分前より閉める
            if (moment() < moment(conf.get('datetimes.reservation_start_customers_second')) &&
                // tslint:disable-next-line:no-magic-numbers
                moment() > moment(conf.get('datetimes.reservation_start_customers_second')).add(-15, 'minutes')) {
                if (!_.isEmpty(req.query.locale)) {
                    req.setLocale(req.query.locale);
                }
                next(new Error(req.__('Message.OutOfTerm')));
                return;
            }
        }
        try {
            const reservationModel = yield reserveBaseController.processStart(PURCHASER_GROUP, req);
            if (reservationModel.performance !== undefined) {
                reservationModel.save(req);
                //2017/05/11 座席選択削除
                //res.redirect('/customer/reserve/terms');
                res.redirect('/customer/reserve/tickets');
                //---
            }
            else {
                // 今回は必ずパフォーマンス指定で遷移してくるはず
                next(new Error(req.__('UnexpectedError')));
                // reservationModel.save(() => {
                //     res.redirect('/customer/reserve/performances');
                // });
            }
        }
        catch (error) {
            console.error(error);
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.start = start;
/**
 * 券種選択
 */
function tickets(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Expired')));
                return;
            }
            reservationModel.paymentMethod = '';
            if (req.method === 'POST') {
                // 仮予約あればキャンセルする
                try {
                    yield reserveBaseController.processCancelSeats(reservationModel);
                }
                catch (error) {
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
                    yield reserveBaseController.processFixSeatsAndTickets(reservationModel, req);
                    reservationModel.save(req);
                    res.redirect('/customer/reserve/profile');
                }
                catch (error) {
                    // "予約可能な席がございません"などのメッセージ表示
                    res.locals.message = error.message;
                    res.render('customer/reserve/tickets', {
                        reservationModel: reservationModel
                    });
                }
            }
            else {
                // 券種選択画面へ遷移
                res.locals.message = '';
                res.render('customer/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
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
function profile(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
            if (reservationModel === null) {
                next(new Error(req.__('Expired')));
                return;
            }
            if (req.method === 'POST') {
                try {
                    // 購入者情報FIXプロセス
                    yield reserveBaseController.processFixProfile(reservationModel, req, res);
                    try {
                        // クレジットカード決済のオーソリ、あるいは、オーダーID発行
                        yield processFixGMO(reservationModel, req);
                    }
                    catch (e) {
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
                                GMO_ENDPOINT: conf.get('gmo_payment_endpoint'),
                                GMO_SHOP_ID: conf.get('gmo_payment_shop_id'),
                                GMOERROR: errMsg
                            });
                            return;
                        }
                        else {
                            //GMO以外のエラーはガチエラー
                            //return next(new Error(req.__('UnexpectedError')));
                            next(new Error(req.__('UnexpectedError')));
                            return;
                        }
                    }
                    reservationModel.save(req);
                    res.redirect('/customer/reserve/confirm');
                }
                catch (error) {
                    console.error(error);
                    res.render('customer/reserve/profile', {
                        reservationModel: reservationModel,
                        GMO_ENDPOINT: process.env.GMO_ENDPOINT,
                        GMO_SHOP_ID: process.env.GMO_SHOP_ID
                    });
                }
            }
            else {
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
                    GMO_SHOP_ID: process.env.GMO_SHOP_ID
                });
            }
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.profile = profile;
/**
 * 予約内容確認
 */
function confirm(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservationModel = session_1.default.FIND(req);
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
                    const transactionResult = yield ttts.service.transaction.placeOrderInProgress.confirm({
                        agentId: reservationModel.agentId,
                        transactionId: reservationModel.id,
                        paymentMethod: reservationModel.paymentMethod
                    })(new ttts.repository.Transaction(ttts.mongoose.connection), new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection), new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection));
                    debug('transacion confirmed. orderNumber:', transactionResult.order.orderNumber);
                    try {
                        // 完了メールキュー追加(あれば更新日時を更新するだけ)
                        const emailQueue = yield reserveBaseController.createEmailQueue(transactionResult.eventReservations, reservationModel, res);
                        yield ttts.Models.EmailQueue.create(emailQueue);
                        debug('email queue created.');
                    }
                    catch (error) {
                        console.error(error);
                        // 失敗してもスルー(ログと運用でなんとかする)
                    }
                    session_1.default.REMOVE(req);
                    res.redirect(`/customer/reserve/${reservationModel.performance.day}/${reservationModel.paymentNo}/complete`);
                    //}
                }
                catch (error) {
                    session_1.default.REMOVE(req);
                    next(error);
                }
            }
            else {
                res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.confirm = confirm;
/**
 * 予約完了
 */
function complete(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const transactionDoc = yield transactionRepo.transactionModel.findOne({
                'result.eventReservations.performance_day': req.params.performanceDay,
                'result.eventReservations.payment_no': req.params.paymentNo,
                'result.eventReservations.purchaser_group': PURCHASER_GROUP,
                'result.eventReservations.status': ttts.factory.reservationStatusType.ReservationConfirmed,
                'result.eventReservations.purchased_at': {
                    $gt: moment().add(-30, 'minutes').toDate() // tslint:disable-line:no-magic-numbers
                }
            }).exec();
            if (transactionDoc === null) {
                next(new Error(req.__('NotFound')));
                return;
            }
            const transaction = transactionDoc.toObject();
            debug('confirmed transaction:', transaction.id);
            let reservations = transaction.result.eventReservations;
            debug(reservations.length, 'reservation(s) found.');
            reservations = reservations.filter((r) => r.status === ttts.factory.reservationStatusType.ReservationConfirmed);
            if (reservations.length === 0) {
                next(new Error(req.__('NotFound')));
                return;
            }
            reservations.sort((a, b) => ttts.factory.place.screen.sortBySeatCode(a.seat_code, b.seat_code));
            // 印刷トークン発行
            const tokenRepo = new ttts.repository.Token(redisClient);
            const printToken = yield tokenRepo.createPrintToken(reservations.map((r) => r.id));
            debug('printToken created.', printToken);
            res.render('customer/reserve/complete', {
                reservations: reservations,
                printToken: printToken
            });
        }
        catch (error) {
            next(new Error(req.__('UnexpectedError')));
        }
    });
}
exports.complete = complete;
/**
 * GMO決済FIXプロセス
 * @param {ReserveSessionModel} reservationModel
 * @returns {Promise<void>}
 */
function processFixGMO(reservationModel, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const DIGIT_OF_SERIAL_NUMBER_IN_ORDER_ID = -2;
        let orderId;
        if (reservationModel.transactionGMO === undefined) {
            reservationModel.transactionGMO = {
                orderId: '',
                accessId: '',
                accessPass: '',
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
                reservePaymentCreditForm_1.default(req);
                const validationResult = yield req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    throw new Error(req.__('Invalid"'));
                }
                // クレジットカードオーソリ取得済であれば取消
                if (reservationModel.creditCardAuthorizeActionId !== undefined) {
                    const actionId = reservationModel.creditCardAuthorizeActionId;
                    delete reservationModel.creditCardAuthorizeActionId;
                    yield ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(reservationModel.agentId, reservationModel.id, actionId);
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
                const action = yield ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(reservationModel.agentId, reservationModel.id, orderId, amount, ttts.GMO.utils.util.Method.Lump, // 支払い方法は一括
                gmoTokenObject, process.env.GMO_SHOP_ID, process.env.GMO_SHOP_PASS);
                debug('credit card authorizeAction created.', action.id);
                reservationModel.creditCardAuthorizeActionId = action.id;
                const authorizeActionResult = action.result;
                reservationModel.transactionGMO.accessId = authorizeActionResult.execTranArgs.accessId; // セッションに持つ必要ある？
                reservationModel.transactionGMO.accessPass = authorizeActionResult.execTranArgs.accessPass; // セッションに持つ必要ある？
                reservationModel.transactionGMO.orderId = orderId;
                reservationModel.transactionGMO.amount = amount;
                reservationModel.transactionGMO.status = ttts.GMO.utils.util.Status.Auth;
                break;
            default:
                break;
        }
    });
}
