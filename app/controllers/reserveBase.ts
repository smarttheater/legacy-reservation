
/**
 * 座席予約ベースコントローラー
 *
 * @namespace controller/reserveBase
 */

import * as GMO from '@motionpicture/gmo-service';
import { EmailQueueUtil, Models, ReservationUtil, ScreenUtil } from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as createDebug from 'debug';
import { Request, Response } from 'express';
import * as fs from 'fs-extra';
import * as moment from 'moment';
import * as numeral from 'numeral';
import * as _ from 'underscore';

import reserveProfileForm from '../forms/reserve/reserveProfileForm';
import reserveTicketForm from '../forms/reserve/reserveTicketForm';
import ReserveSessionModel from '../models/reserve/session';

const debug = createDebug('ttts-frontend:controller:reserveBase');
const DEFAULT_RADIX = 10;

/**
 * 座席・券種FIXプロセス
 *
 * @param {ReserveSessionModel} reservationModel
 * @returns {Promise<void>}
 */
// tslint:disable-next-line:max-func-body-length
export async function processFixSeatsAndTickets(reservationModel: ReserveSessionModel,
                                                req: Request): Promise<void> {
    // 検証(券種が選択されていること)+チケット枚数合計計算
    const checkInfo = await checkFixSeatsAndTickets(req);
    if (checkInfo.status === false) {
        throw new Error(checkInfo.message);
    }
    const selectedCount: number = checkInfo.selectedCount;
    const choices = checkInfo.choicesAll;

    // 予約可能件数チェック+予約情報取得
    const infos = await getInfoFixSeatsAndTickets(reservationModel, req, selectedCount);
    if (infos.status === false) {
        throw new Error(infos.message);
    }

    // チケット情報に枚数セット
    reservationModel.ticketTypes.forEach((ticketType) => {
        const choice = checkInfo.choices.find((c: any) => (ticketType._id === c.ticket_type));
        ticketType.count = (choice !== undefined) ? Number(choice.ticket_count) : 0;
    });

    // セッション中の予約リストを初期化
    reservationModel.seatCodes = [];
    reservationModel.expiredAt = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();

    // 予約情報更新(「仮予約:TEMPORARY」にアップデートする処理を枚数分実行)
    let updateCount: number = 0;
    const promises = choices.map(async(choice: any) => {
        // 予約情報更新キーセット(パフォーマンス,'予約可能')
        const updateKey = {
            performance: reservationModel.performance._id,
            status: ReservationUtil.STATUS_AVAILABLE
        };
        // '予約可能'を'仮予約'に変更
        const reservation = await Models.Reservation.findOneAndUpdate(
            updateKey,
            {
                status: ReservationUtil.STATUS_TEMPORARY,
                // 2017/05/23 chevreの"TEMPORARY"データに項目を合わせるため削除
                //payment_no: reservationModel.paymentNo,
                //ticket_type: (<any>choice).ticket_type,
                //---
                expired_at: reservationModel.expiredAt
            },
            {
                new: true
            }
        ).exec();
        // 更新エラー(対象データなし):次のseatへ
        if (reservation === null) {
            debug('update error');
        } else {
            updateCount = updateCount + 1;
            // チケット情報+座席情報をセッションにsave
            saveSessionFixSeatsAndTickets(req, reservationModel, reservation, choice);
        }
    });
    await Promise.all(promises);

    // 予約枚数が指定枚数に達しなかった時,予約可能に戻す
    if (updateCount < selectedCount) {
        await processCancelSeats(reservationModel);
        // "予約可能な席がございません"
        throw new Error(req.__('Message.NoAvailableSeats'));
    }
}
/**
 * 座席・券種FIXプロセス/検証処理
 *
 * @param {Request} req
 * @returns {Promise<void>}
 */
async function checkFixSeatsAndTickets(req: Request) : Promise<any> {
    const checkInfo : any = {
        status: false,
        choices: null,
        choicesAll: [],
        selectedCount: 0,
        message: ''
    };
    // 検証(券種が選択されていること)
    reserveTicketForm(req);
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
        checkInfo.message =  req.__('Message.Invalid');
        return checkInfo;
    }
    // 画面から座席選択情報が生成できなければエラー
    const choices = JSON.parse(req.body.choices);
    if (!Array.isArray(choices)) {
        checkInfo.message =  req.__('Message.UnexpectedError');
        return checkInfo;
    }
    checkInfo.choices = choices;
    // チケット枚数合計計算
    choices.forEach((choice: any) => {
        checkInfo.selectedCount += Number(choice.ticket_count);
        for (let index = 0; index < Number(choice.ticket_count); index = index + 1) {
            const choiceOne = {
                ticket_type : (<any>choice).ticket_type,
                ticketCount: 1,
                updated: false
            };
            checkInfo.choicesAll.push(choiceOne);
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
async function getInfoFixSeatsAndTickets(reservationModel: ReserveSessionModel,
                                         req: Request,
                                         selectedCount: number) : Promise<any> {
    const info : any = {
        status: false,
        results: null,
        message: ''
    };
    // 予約可能件数取得
    const conditions: any = {
        performance: reservationModel.performance._id,
        status : ReservationUtil.STATUS_AVAILABLE
    };
    const count = await Models.Reservation.count(conditions).exec();
    // チケット枚数より少ない場合は、購入不可としてリターン
    if (count < selectedCount) {
        // "予約可能な席がございません"
        info.message = req.__('Message.NoAvailableSeats');
        return info;
    }
    // 予約情報取得
    const reservations = await Models.Reservation.find(conditions).exec();
    info.results = reservations.map((reservation) => {
        return {
            _id: reservation._id,
            performance: (<any>reservation).performance,
            seat_code: (<any>reservation).seat_code,
            used: false
        };
    });
    // チケット枚数より少ない場合は、購入不可としてリターン
    if (info.results.length < selectedCount) {
        // "予約可能な席がございません"
        info.message = req.__('Message.NoAvailableSeats');
        return info;
    }
    info.status = true;
    return info;
}
/**
 * 座席・券種FIXプロセス/予約情報をセッションにsave
 *
 * @param {ReservationModel} reservationModel
 * @param {Request} req
 * @param {any} result
 * @returns {Promise<void>}
 */
function saveSessionFixSeatsAndTickets(req: Request,
                                       reservationModel: ReserveSessionModel,
                                       result: any,
                                       choice: any) : void {
    // チケット情報
    const ticketType = reservationModel.ticketTypes.find((ticketTypeInArray) => (ticketTypeInArray._id === choice.ticket_type));
    if (ticketType === undefined) {
        throw new Error(req.__('Message.UnexpectedError'));
    }
    // 座席情報
    const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => (seat.code === result.seat_code));
    if (seatInfo === undefined) {
        throw new Error(req.__('Message.InvalidSeatCode'));
    }
    // セッションに保管
    reservationModel.seatCodes.push(result.seat_code);
    reservationModel.setReservation(result.seat_code, {
        _id : result._id,
        status : result.status,
        seat_code : result.seat_code,
        seat_grade_name : seatInfo.grade.name,
        seat_grade_additional_charge : seatInfo.grade.additional_charge,
        ticket_type : ticketType._id,
        ticket_type_name : ticketType.name,
        ticket_type_charge : ticketType.charge,
        watcher_name: ''
    });
    // 座席コードのソート(文字列順に)
    reservationModel.seatCodes.sort(ScreenUtil.sortBySeatCode);
    return;
}

// 未使用
export async function processFixTickets(reservationModel: ReserveSessionModel, req: Request): Promise<void> {
    reserveTicketForm(req);
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
        throw new Error(req.__('Message.Invalid'));
    }

    // 座席選択情報を保存して座席選択へ
    const choices = JSON.parse(req.body.choices);
    if (!Array.isArray(choices)) {
        throw new Error(req.__('Message.UnexpectedError'));
    }

    choices.forEach((choice: any) => {
        const ticketType = reservationModel.ticketTypes.find((ticketTypeInArray) => (ticketTypeInArray._id === choice.ticket_type));
        if (ticketType === undefined) {
            throw new Error(req.__('Message.UnexpectedError'));
        }

        const reservation = reservationModel.getReservation(choice.seat_code);
        reservation.ticket_type = ticketType._id;
        reservation.ticket_type_name = ticketType.name;
        reservation.ticket_type_charge = ticketType.charge;
        reservation.watcher_name = choice.watcher_name;

        reservationModel.setReservation(reservation.seat_code, reservation);
    });
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
        if (errors) {
            // tslint:disable-next-line:no-console
            console.debug(errors);
        }
        throw new Error(req.__('Message.Invalid'));
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
    //reservationModel.paymentMethod = req.body.paymentMethod;
    reservationModel.paymentMethod = GMO.Util.PAY_TYPE_CREDIT;

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
    if (!_.isEmpty(req.query.locale)) {
        (<any>req.session).locale = req.query.locale;
    } else {
        (<any>req.session).locale = 'ja';
    }

    // 予約トークンを発行
    const reservationModel = new ReserveSessionModel();
    reservationModel.purchaserGroup = purchaserGroup;
    initializePayment(reservationModel, req);

    if (!_.isEmpty(req.query.performance)) {
        // パフォーマンス指定遷移の場合 パフォーマンスFIX
        await processFixPerformance(reservationModel, req.query.performance, req);
    }

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
    reservationModel.paymentMethodChoices = [GMO.Util.PAY_TYPE_CREDIT, GMO.Util.PAY_TYPE_CVS];

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
    const ids = reservationModel.getReservationIds();
    if (ids.length > 0) {
        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        // 仮予約を空席ステータスに戻す
        //try {
            //await Models.Reservation.remove({ _id: { $in: ids } }).exec();
        //} catch (error) {
            // 失敗したとしても時間経過で消えるので放置
        //}

        // 仮予約を空席ステータスに戻す
        // 2017/05 予約レコード削除からSTATUS初期化へ変更
        const promises = ids.map(async (id: any) => {
            try {
                await Models.Reservation.findByIdAndUpdate(
                    { _id: id },
                    {
                        status: ReservationUtil.STATUS_AVAILABLE,
                        payment_no: null,
                        ticket_type: null,
                        expired_at: null
                    },
                    {
                        new: true
                    }
                ).exec();
            } catch (error) {
                //失敗したとしても時間経過で消えるので放置
            }
        });
        await Promise.all(promises);
    }
}

/**
 * パフォーマンスをFIXするプロセス
 * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
 */
// tslint:disable-next-line:max-func-body-length
export async function processFixPerformance(reservationModel: ReserveSessionModel, perfomanceId: string, req: Request): Promise<void> {
    // パフォーマンス取得
    const performance = await Models.Performance.findById(
        perfomanceId,
        'day open_time start_time end_time canceled film screen screen_name theater theater_name ticket_type_group' // 必要な項目だけ指定すること
    )
        .populate('film', 'name is_mx4d copyright') // 必要な項目だけ指定すること
        .populate('screen', 'name sections') // 必要な項目だけ指定すること
        .populate('theater', 'name address') // 必要な項目だけ指定すること
        .exec();

    if (performance === null) {
        throw new Error(req.__('Message.NotFound'));
    }

    if (performance.get('canceled') === true) { // 万が一上映中止だった場合
        throw new Error(req.__('Message.OutOfTerm'));
    }

    // 上映日当日まで購入可能
    if (parseInt(performance.get('day'), DEFAULT_RADIX) < parseInt(moment().format('YYYYMMDD'), DEFAULT_RADIX)) {
        throw new Error('You cannot reserve this performance.');
    }

    // 券種取得
    const ticketTypeGroup = await Models.TicketTypeGroup.findOne(
        { _id: performance.get('ticket_type_group') }
    ).populate('ticket_types').exec();
    reservationModel.ticketTypes = ticketTypeGroup.get('ticket_types');

    reservationModel.seatCodes = [];

    // パフォーマンス情報を保管
    reservationModel.performance = {
        _id: performance.get('_id'),
        day: performance.get('day'),
        open_time: performance.get('open_time'),
        start_time: performance.get('start_time'),
        end_time: performance.get('end_time'),
        start_str: performance.get('start_str'),
        location_str: performance.get('location_str'),
        theater: {
            _id: performance.get('theater').get('_id'),
            name: performance.get('theater').get('name'),
            address: performance.get('theater').get('address')
        },
        screen: {
            _id: performance.get('screen').get('_id'),
            name: performance.get('screen').get('name'),
            sections: performance.get('screen').get('sections')
        },
        film: {
            _id: performance.get('film').get('_id'),
            name: performance.get('film').get('name'),
            image: `${req.protocol}://${req.hostname}/images/film/${performance.get('film').get('_id')}.jpg`,
            is_mx4d: performance.get('film').get('is_mx4d'),
            copyright: performance.get('film').get('copyright')
        }
    };

    // 座席グレードリスト抽出
    reservationModel.seatGradeCodesInScreen = reservationModel.performance.screen.sections[0].seats
        .map((seat) => seat.grade.code)
        .filter((seatCode, index, seatCodes) => seatCodes.indexOf(seatCode) === index);

    // コンビニ決済はパフォーマンス上映の5日前まで
    // tslint:disable-next-line:no-magic-numbers
    const day5DaysAgo = parseInt(moment().add(+5, 'days').format('YYYYMMDD'), DEFAULT_RADIX);
    if (parseInt(reservationModel.performance.day, DEFAULT_RADIX) < day5DaysAgo) {
        if (reservationModel.paymentMethodChoices.indexOf(GMO.Util.PAY_TYPE_CVS) >= 0) {
            reservationModel.paymentMethodChoices.splice(reservationModel.paymentMethodChoices.indexOf(GMO.Util.PAY_TYPE_CVS), 1);
        }
    }

    // スクリーン座席表HTMLを保管(kusu screenHtmlがないのでcatch追加)
    // @@@@@最終的にはトルこと
    try {
        reservationModel.screenHtml = fs.readFileSync(
            `${__dirname}/../views/_screens/${performance.get('screen').get('_id').toString()}.ejs`,
            'utf8'
        );
    } catch (e) {
        reservationModel.screenHtml = '';
    }

    // この時点でトークンに対して購入番号発行(上映日が決まれば購入番号を発行できる)
    reservationModel.paymentNo = await ReservationUtil.publishPaymentNo(reservationModel.performance.day);
}

/**
 * 座席をFIXするプロセス
 * 新規仮予約 ここが今回の肝です！！！
 *
 * @param {ReserveSessionModel} reservationModel
 * @param {Array<string>} seatCodes
 */
export async function processFixSeats(reservationModel: ReserveSessionModel, seatCodes: string[], req: Request): Promise<void> {
    // セッション中の予約リストを初期化
    reservationModel.seatCodes = [];
    reservationModel.expiredAt = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();

    // 新たな座席指定と、既に仮予約済みの座席コードについて
    const promises = seatCodes.map(async (seatCode) => {
        const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => (seat.code === seatCode));

        // 万が一、座席が存在しなかったら
        if (seatInfo === undefined) {
            throw new Error(req.__('Message.InvalidSeatCode'));
        }

        // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
        const reservation = await Models.Reservation.create({
            performance: reservationModel.performance._id,
            seat_code: seatCode,
            status: ReservationUtil.STATUS_TEMPORARY,
            expired_at: reservationModel.expiredAt
        });

        // ステータス更新に成功したらセッションに保管
        reservationModel.seatCodes.push(seatCode);
        reservationModel.setReservation(seatCode, {
            _id: reservation.get('_id'),
            status: reservation.get('status'),
            seat_code: reservation.get('seat_code'),
            seat_grade_name: seatInfo.grade.name,
            seat_grade_additional_charge: seatInfo.grade.additional_charge,
            ticket_type: '', // この時点では券種未決定
            ticket_type_name: {
                ja: '',
                en: ''
            },
            ticket_type_charge: 0,
            watcher_name: ''
        });
    });

    await Promise.all(promises);
    // 座席コードのソート(文字列順に)
    reservationModel.seatCodes.sort(ScreenUtil.sortBySeatCode);
}

/**
 * 確定以外の全情報を確定するプロセス
 */
export async function processAllExceptConfirm(reservationModel: ReserveSessionModel, req: Request): Promise<void> {
    const commonUpdate: any = {
    };

    // クレジット決済
    if (reservationModel.paymentMethod === GMO.Util.PAY_TYPE_CREDIT) {
        commonUpdate.gmo_shop_id = process.env.GMO_SHOP_ID;
        commonUpdate.gmo_shop_pass = process.env.GMO_SHOP_PASS;
        commonUpdate.gmo_order_id = reservationModel.transactionGMO.orderId;
        commonUpdate.gmo_amount = reservationModel.transactionGMO.amount;
        commonUpdate.gmo_access_id = reservationModel.transactionGMO.accessId;
        commonUpdate.gmo_access_pass = reservationModel.transactionGMO.accessPass;
        commonUpdate.gmo_status = GMO.Util.STATUS_CREDIT_AUTH;
    } else if (reservationModel.paymentMethod === GMO.Util.PAY_TYPE_CVS) {
        // オーダーID保管
        commonUpdate.gmo_order_id = reservationModel.transactionGMO.orderId;
    }

    // いったん全情報をDBに保存
    await Promise.all(reservationModel.seatCodes.map(async (seatCode, index) => {
        let update = reservationModel.seatCode2reservationDocument(seatCode);
        update = Object.assign(update, commonUpdate);
        (<any>update).payment_seat_index = index;

        const reservation = await Models.Reservation.findByIdAndUpdate(
            update._id,
            update,
            { new: true }
        ).exec();

        // IDの予約ドキュメントが万が一なければ予期せぬエラー(基本的にありえないフローのはず)
        if (reservation === null) {
            throw new Error(req.__('Message.UnexpectedError'));
        }
    }));
}

/**
 * 購入番号から全ての予約を完了にする
 *
 * @param {string} paymentNo 購入番号
 * @param {Object} update 追加更新パラメータ
 */
export async function processFixReservations(performanceDay: string, paymentNo: string, update: any, res: Response): Promise<void> {
    (<any>update).purchased_at = moment().valueOf();
    (<any>update).status = ReservationUtil.STATUS_RESERVED;

    // 予約完了ステータスへ変更
    await Models.Reservation.update(
        {
            performance_day: performanceDay,
            payment_no: paymentNo
        },
        update,
        { multi: true } // 必須！複数予約ドキュメントを一度に更新するため
    ).exec();

    try {
        // 完了メールキュー追加(あれば更新日時を更新するだけ)
        const emailQueue = await createEmailQueue(res, performanceDay, paymentNo);
        await Models.EmailQueue.create(emailQueue);
    } catch (error) {
        console.error(error);
        // 失敗してもスルー(ログと運用でなんとかする)
    }
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
 *
 * @memberOf ReserveBaseController
 */
async function createEmailQueue(res: Response, performanceDay: string, paymentNo: string): Promise<IEmailQueue> {
    const reservations = await Models.Reservation.find({
        performance_day: performanceDay,
        payment_no: paymentNo
    }).exec();
    debug('reservations for email found.', reservations.length);
    if (reservations.length === 0) {
        throw new Error(`reservations of payment_no ${paymentNo} not found`);
    }

    const to = reservations[0].get('purchaser_email');
    debug('to is', to);
    if (to.length === 0) {
        throw new Error('email to unknown');
    }

    const titleJa = 'TTTS_EVENT_NAMEチケット 購入完了のお知らせ';
    const titleEn = 'Notice of Completion of TTTS Ticket Purchase';

    debug('rendering template...');

    return new Promise<IEmailQueue>((resolve, reject) => {
        res.render(
            'email/reserve/complete',
            {
                layout: false,
                titleJa: titleJa,
                titleEn: titleEn,
                reservations: reservations,
                moment: moment,
                numeral: numeral,
                conf: conf,
                GMOUtil: GMO.Util,
                ReservationUtil: ReservationUtil
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
                    subject: `${titleJa} ${titleEn}`,
                    content: { // 本文
                        mimetype: 'text/plain',
                        text: text
                    },
                    status: EmailQueueUtil.STATUS_UNSENT
                };
                resolve(emailQueue);
            });
    });
}
