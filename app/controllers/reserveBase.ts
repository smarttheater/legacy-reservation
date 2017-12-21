
/**
 * 座席予約ベースコントローラー
 * @namespace controller/reserveBase
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as createDebug from 'debug';
import { Request, Response } from 'express';
import * as moment from 'moment';
import * as numeral from 'numeral';
import * as _ from 'underscore';

import reserveProfileForm from '../forms/reserve/reserveProfileForm';
import reserveTicketForm from '../forms/reserve/reserveTicketForm';
import ReserveSessionModel from '../models/reserve/session';

const debug = createDebug('ttts-frontend:controller:reserveBase');

// 車椅子レート制限のためのRedis接続クライアント
const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

/**
 * 座席・券種FIXプロセス
 *
 * @param {ReserveSessionModel} reservationModel
 * @returns {Promise<void>}
 */
// tslint:disable-next-line:max-func-body-length
export async function processFixSeatsAndTickets(
    reservationModel: ReserveSessionModel,
    req: Request
): Promise<void> {
    // 検証(券種が選択されていること)+チケット枚数合計計算
    const checkInfo = await checkFixSeatsAndTickets(reservationModel, req);
    if (!checkInfo.status) {
        throw new Error(checkInfo.message);
    }

    // 予約可能件数チェック+予約情報取得
    const infos = await getInfoFixSeatsAndTickets(reservationModel, req, Number(checkInfo.selectedCount) + Number(checkInfo.extraCount));
    if (infos.status === false) {
        throw new Error(infos.message);
    }

    // チケット情報に枚数セット(画面で選択された枚数<画面再表示用)
    reservationModel.ticketTypes.forEach((ticketType) => {
        const choice = checkInfo.choices.find((c) => ticketType.id === c.ticket_type);
        ticketType.count = (choice !== undefined) ? Number(choice.ticket_count) : 0;
    });

    // セッション中の予約リストを初期化
    reservationModel.seatCodes = [];
    reservationModel.seatCodesExtra = [];

    // 座席承認アクション
    const offers = checkInfo.choicesAll.map((choice) => {
        // チケット情報
        const ticketType = reservationModel.ticketTypes.find((ticketTypeInArray) => (ticketTypeInArray.id === choice.ticket_type));
        if (ticketType === undefined) {
            throw new Error(req.__('UnexpectedError'));
        }

        return {
            ticket_type: ticketType.id,
            watcher_name: ''
        };
    });
    debug(`creating seatReservation authorizeAction on ${offers.length} offers...`);
    const action = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
        reservationModel.agentId,
        reservationModel.id,
        reservationModel.performance.id,
        offers
    )(
        new ttts.repository.Transaction(ttts.mongoose.connection),
        new ttts.repository.Performance(ttts.mongoose.connection),
        new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection),
        new ttts.repository.PaymentNo(ttts.mongoose.connection),
        new ttts.repository.rateLimit.TicketTypeCategory(redisClient)
        );
    reservationModel.seatReservationAuthorizeActionId = action.id;
    // この時点で購入番号が発行される
    reservationModel.paymentNo = (<ttts.factory.action.authorize.seatReservation.IResult>action.result).tmpReservations[0].payment_no;
    const tmpReservations = (<ttts.factory.action.authorize.seatReservation.IResult>action.result).tmpReservations;

    // セッションに保管
    reservationModel.seatCodes = tmpReservations.filter((r) => r.status_after === ttts.factory.reservationStatusType.ReservationConfirmed)
        .map((r) => r.seat_code);
    reservationModel.seatCodesExtra = tmpReservations.filter(
        (r) => r.status_after !== ttts.factory.reservationStatusType.ReservationConfirmed
    ).map((r) => r.seat_code);

    tmpReservations.forEach((tmpReservation) => {
        reservationModel.setReservation(tmpReservation.seat_code, tmpReservation);
    });
    // 座席コードのソート(文字列順に)
    reservationModel.seatCodes.sort(ttts.factory.place.screen.sortBySeatCode);
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
 * 座席・券種FIXプロセス/検証処理
 *
 * @param {ReservationModel} reservationModel
 * @param {Request} req
 * @returns {Promise<void>}
 */
async function checkFixSeatsAndTickets(reservationModel: ReserveSessionModel, req: Request): Promise<ICheckInfo> {
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
        checkInfo.message = req.__('Invalid"');

        return checkInfo;
    }
    // 画面から座席選択情報が生成できなければエラー
    const choices: IChoice[] = JSON.parse(req.body.choices);
    if (!Array.isArray(choices)) {
        checkInfo.message = req.__('UnexpectedError');

        return checkInfo;
    }
    checkInfo.choices = choices;

    // 特殊チケット情報
    const extraSeatNum: {
        [key: string]: number
    } = {};
    reservationModel.ticketTypes.forEach((ticketTypeInArray) => {
        if (ticketTypeInArray.ttts_extension.category !== ttts.factory.ticketTypeCategory.Normal) {
            extraSeatNum[ticketTypeInArray.id] = ticketTypeInArray.ttts_extension.required_seat_num;
        }
    });

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
            // 特殊の時、必要枚数分セット
            if (extraSeatNum.hasOwnProperty(choice.ticket_type)) {
                const extraCount: number = Number(extraSeatNum[choice.ticket_type]) - 1;
                for (let indexExtra = 0; indexExtra < extraCount; indexExtra += 1) {
                    choiceInfo.choicesExtra.push({
                        ticket_type: choice.ticket_type,
                        ticketCount: 1,
                        updated: false
                    });
                    checkInfo.extraCount += 1;
                }
            }
            // 選択チケット本体分セット(選択枚数分)
            checkInfo.choicesAll.push(choiceInfo);
        }
    });
    checkInfo.status = true;

    return checkInfo;
}
/**
 * 座席・券種FIXプロセス/予約情報取得処理
 *
 * @param {ReservationModel} reservationModel
 * @param {Request} req
 * @param {number} selectedCount
 * @returns {Promise<void>}
 */
async function getInfoFixSeatsAndTickets(
    reservationModel: ReserveSessionModel,
    req: Request,
    selectedCount: number
): Promise<any> {
    const stockRepo = new ttts.repository.Stock(ttts.mongoose.connection);

    const info: any = {
        status: false,
        results: null,
        message: ''
    };
    // 予約可能件数取得
    const conditions: any = {
        performance: reservationModel.performance.id,
        availability: ttts.factory.itemAvailability.InStock
    };
    const count = await stockRepo.stockModel.count(conditions).exec();
    // チケット枚数より少ない場合は、購入不可としてリターン
    if (count < selectedCount) {
        // "予約可能な席がございません"
        info.message = req.__('NoAvailableSeats');

        return info;
    }
    // 予約情報取得
    const stocks = await stockRepo.stockModel.find(conditions).exec();
    info.results = stocks.map((stock) => {
        return {
            id: stock.id,
            performance: (<any>stock).performance,
            seat_code: (<any>stock).seat_code,
            used: false
        };
    });
    // チケット枚数より少ない場合は、購入不可としてリターン
    if (info.results.length < selectedCount) {
        // "予約可能な席がございません"
        info.message = req.__('NoAvailableSeats');

        return info;
    }
    info.status = true;

    return info;
}

/**
 * 購入者情報FIXプロセス
 *
 * @param {ReserveSessionModel} reservationModel
 * @returns {Promise<void>}
 */
export async function processFixProfile(reservationModel: ReserveSessionModel, req: Request, res: Response): Promise<void> {
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

    if (!validationResult.isEmpty()) {
        const errors = req.validationErrors(true);
        if (errors !== undefined) {
            // tslint:disable-next-line:no-console
            console.log(errors);
        }
        throw new Error(req.__('Invalid"'));
    }

    // 購入者情報を保存して座席選択へ
    reservationModel.purchaser = {
        lastName: req.body.lastName,
        firstName: req.body.firstName,
        tel: req.body.tel,
        email: req.body.email,
        age: req.body.age,
        address: req.body.address,
        gender: req.body.gender
    };

    // 決済方法はクレジットカード一択
    reservationModel.paymentMethod = ttts.factory.paymentMethodType.CreditCard;

    await ttts.service.transaction.placeOrderInProgress.setCustomerContact(
        reservationModel.agentId,
        reservationModel.id,
        {
            last_name: req.body.lastName,
            first_name: req.body.firstName,
            tel: req.body.tel,
            email: req.body.email,
            age: req.body.age,
            address: req.body.address,
            gender: req.body.gender
        }
    )(new ttts.repository.Transaction(ttts.mongoose.connection));

    // セッションに購入者情報格納
    (<any>req.session).purchaser = {
        lastName: req.body.lastName,
        firstName: req.body.firstName,
        tel: req.body.tel,
        email: req.body.email,
        age: req.body.age,
        address: req.body.address,
        gender: req.body.gender
    };
}

/**
 * 購入開始プロセス
 *
 * @param {string} purchaserGroup 購入者区分
 */
export async function processStart(purchaserGroup: string, req: Request): Promise<ReserveSessionModel> {
    // 言語も指定
    // 2017/06/19 upsate node+typesctipt
    (<any>req.session).locale = (!_.isEmpty(req.query.locale)) ? req.query.locale : 'ja';
    // 予約トークンを発行
    const reservationModel = new ReserveSessionModel();
    reservationModel.purchaserGroup = purchaserGroup;
    reservationModel.category = req.query.category;
    initializePayment(reservationModel, req);

    if (!_.isEmpty(req.query.performance)) {
        // パフォーマンス指定遷移の場合 パフォーマンスFIX
        await processFixPerformance(reservationModel, req.query.performance, req);
    }

    const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
    const seller = await organizationRepo.findCorporationByIdentifier('TokyoTower');

    reservationModel.expires = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').toDate();
    const transaction = await ttts.service.transaction.placeOrderInProgress.start({
        // tslint:disable-next-line:no-magic-numbers
        expires: reservationModel.expires,
        agentId: <string>process.env.API_CLIENT_ID,
        sellerIdentifier: 'TokyoTower', // 電波塔さんの組織識別子(現時点で固定)
        purchaserGroup: purchaserGroup
    })(
        new ttts.repository.Transaction(ttts.mongoose.connection),
        new ttts.repository.Organization(ttts.mongoose.connection),
        new ttts.repository.Owner(ttts.mongoose.connection)
        );
    debug('transaction started.', transaction.id);

    reservationModel.id = transaction.id;
    reservationModel.agentId = transaction.agent.id;
    reservationModel.sellerId = transaction.seller.id;
    reservationModel.seller = seller;

    return reservationModel;
}

/**
 * 購入情報を初期化する
 */
function initializePayment(reservationModel: ReserveSessionModel, req: Request): void {
    if (reservationModel.purchaserGroup === undefined) {
        throw new Error('purchaser group undefined.');
    }

    const purchaserFromSession = <IPurchaser | undefined>(<any>req.session).purchaser;

    reservationModel.purchaser = {
        lastName: '',
        firstName: '',
        tel: '',
        email: '',
        age: '',
        address: '',
        gender: '1'
    };
    reservationModel.paymentMethodChoices = [ttts.GMO.utils.util.PayType.Credit, ttts.GMO.utils.util.PayType.Cvs];

    if (purchaserFromSession !== undefined) {
        reservationModel.purchaser = purchaserFromSession;
    }
}

/**
 * 予約フロー中の座席をキャンセルするプロセス
 *
 * @param {ReserveSessionModel} reservationModel
 */
export async function processCancelSeats(reservationModel: ReserveSessionModel): Promise<void> {
    // セッション中の予約リストを初期化
    reservationModel.seatCodes = [];

    // 座席仮予約があればキャンセル
    if (reservationModel.seatReservationAuthorizeActionId !== undefined) {
        await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(
            reservationModel.agentId,
            reservationModel.id,
            reservationModel.seatReservationAuthorizeActionId
        )(
            new ttts.repository.Transaction(ttts.mongoose.connection),
            new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection),
            new ttts.repository.rateLimit.TicketTypeCategory(redisClient)
            );
    }
}

/**
 * パフォーマンスをFIXするプロセス
 * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
 */
// tslint:disable-next-line:max-func-body-length
export async function processFixPerformance(
    reservationModel: ReserveSessionModel, perfomanceId: string, req: Request
): Promise<void> {
    debug('fixing performance...', perfomanceId);
    // パフォーマンス取得
    const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
    const performance = await performanceRepo.findById(perfomanceId);
    if (performance === null) {
        throw new Error(req.__('NotFound'));
    }

    if (performance.canceled === true) { // 万が一上映中止だった場合
        throw new Error(req.__('Message.OutOfTerm'));
    }

    // 上映日当日まで購入可能
    // tslint:disable-next-line:no-magic-numbers
    if (parseInt(performance.day, 10) < parseInt(moment().format('YYYYMMDD'), 10)) {
        throw new Error('You cannot reserve this performance.');
    }

    // 券種セット
    reservationModel.ticketTypes = performance.ticket_type_group.ticket_types.map((t) => {
        return { ...t, ...{ count: 0 } };
    });

    reservationModel.seatCodes = [];

    // パフォーマンス情報を保管
    reservationModel.performance = {
        ...performance,
        ...{
            film: {
                ...performance.film,
                ...{
                    image: `${req.protocol}://${req.hostname}/images/film/${performance.film.id}.jpg`
                }
            }
        }
    };

    // 座席グレードリスト抽出
    reservationModel.seatGradeCodesInScreen = reservationModel.performance.screen.sections[0].seats
        .map((seat) => seat.grade.code)
        .filter((seatCode, index, seatCodes) => seatCodes.indexOf(seatCode) === index);

    // コンビニ決済はパフォーマンス上映の5日前まで
    // tslint:disable-next-line:no-magic-numbers
    const day5DaysAgo = parseInt(moment().add(5, 'days').format('YYYYMMDD'), 10);
    // tslint:disable-next-line:no-magic-numbers
    if (parseInt(reservationModel.performance.day, 10) < day5DaysAgo) {
        if (reservationModel.paymentMethodChoices.indexOf(ttts.GMO.utils.util.PayType.Cvs) >= 0) {
            reservationModel.paymentMethodChoices.splice(reservationModel.paymentMethodChoices.indexOf(ttts.GMO.utils.util.PayType.Cvs), 1);
        }
    }

    // スクリーン座席表HTMLを保管(TTTS未使用)
    reservationModel.screenHtml = '';
}

/**
 * 購入者情報インターフェース
 */
interface IPurchaser {
    lastName: string;
    firstName: string;
    tel: string;
    email: string;
    age: string;
    address: string;
    gender: string;
}

/**
 * 完了メールキューインタフェース
 *
 * @interface IEmailQueue
 */
interface IEmailQueue {
    // tslint:disable-next-line:no-reserved-keywords
    from: { // 送信者
        address: string;
        name: string;
    };
    to: { // 送信先
        address: string;
        name?: string;
    };
    subject: string;
    content: { // 本文
        mimetype: string;
        text: string;
    };
    status: string;
}

/**
 * 予約完了メールを作成する
 * @memberof controller/reserveBase
 */
export async function createEmailQueue(
    reservations: ttts.factory.reservation.event.IReservation[],
    reservationModel: ReserveSessionModel,
    res: Response
): Promise<IEmailQueue> {
    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);

    // 特殊チケットは除外
    reservations = reservations.filter((reservation) => reservation.status === ttts.factory.reservationStatusType.ReservationConfirmed);
    // チケットコード順にソート
    reservations.sort((a, b) => {
        if (a.ticket_type < b.ticket_type) {
            return -1;
        }
        if (a.ticket_type > b.ticket_type) {
            return 1;
        }

        return 0;
    });

    const reservationDocs = reservations.map((reservation) => new reservationRepo.reservationModel(reservation));

    const to = reservations[0].purchaser_email;
    debug('to is', to);
    if (to.length === 0) {
        throw new Error('email to unknown');
    }

    const title = res.__('Title');
    const titleEmail = res.__('EmailTitle');

    // 券種ごとに合計枚数算出
    const ticketInfos: {} = {};
    for (const reservation of reservations) {
        // チケットタイプセット
        const dataValue = reservation.ticket_type;
        // チケットタイプごとにチケット情報セット
        if (!ticketInfos.hasOwnProperty(dataValue)) {
            (<any>ticketInfos)[dataValue] = {
                ticket_type_name: reservation.ticket_type_name,
                charge: `\\${numeral(reservation.charge).format('0,0')}`,
                count: 1
            };
        } else {
            (<any>ticketInfos)[dataValue].count += 1;
        }
    }
    // 券種ごとの表示情報編集 (sort順を変えないよう同期Loop:"for of")
    const ticketInfoArray: string[] = [];
    for (const key of Object.keys(ticketInfos)) {
        const ticketInfo = (<any>ticketInfos)[key];
        ticketInfoArray.push(`${ticketInfo.ticket_type_name[res.locale]} ${res.__('{{n}}Leaf', { n: ticketInfo.count })}`);
    }
    const day: string = moment(reservations[0].performance_day, 'YYYYMMDD').format('YYYY/MM/DD');
    // tslint:disable-next-line:no-magic-numbers
    const time: string = `${reservations[0].performance_start_time.substr(0, 2)}:${reservations[0].performance_start_time.substr(2, 2)}`;

    return new Promise<IEmailQueue>((resolve, reject) => {
        res.render(
            'email/reserve/complete',
            {
                layout: false,
                reservations: reservationDocs,
                moment: moment,
                numeral: numeral,
                conf: conf,
                GMOUtil: ttts.GMO.utils.util,
                ticketInfoArray: ticketInfoArray,
                totalCharge: reservationModel.getTotalCharge(),
                dayTime: `${day} ${time}`
            },
            async (renderErr, text) => {
                debug('email template rendered.', renderErr);
                if (renderErr instanceof Error) {
                    reject(new Error('failed in rendering an email.'));

                    return;
                }

                const emailQueue = {
                    from: { // 送信者
                        address: conf.get<string>('email.from'),
                        name: conf.get<string>('email.fromname')
                    },
                    to: { // 送信先
                        address: to
                        // name: 'testto'
                    },
                    subject: `${title} ${titleEmail}`,
                    content: { // 本文
                        mimetype: 'text/plain',
                        text: text
                    },
                    status: ttts.EmailQueueUtil.STATUS_UNSENT
                };
                resolve(emailQueue);
            });
    });
}

/**
 * 予約情報取得(reservationModelから)
 * @param {ReserveSessionModel} reservationModel
 * @returns {ttts.mongoose.Document[]}
 */
export function getReservations(reservationModel: ReserveSessionModel): ttts.mongoose.Document[] {
    return reservationModel.seatCodes.map((seatCode) => reservationModel.seatCode2reservationDocument(seatCode));
}
