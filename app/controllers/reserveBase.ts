
/**
 * 座席予約ベースコントローラー
 *
 * @namespace controller/reserveBase
 */

import * as GMO from '@motionpicture/gmo-service';
import { EmailQueueUtil, Models, PerformanceUtil, ReservationUtil, ScreenUtil, TicketTypeGroupUtil } from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as createDebug from 'debug';
import { Request, Response } from 'express';
//import * as fs from 'fs-extra';
import * as moment from 'moment';
import * as numeral from 'numeral';
import * as _ from 'underscore';

import reserveProfileForm from '../forms/reserve/reserveProfileForm';
import reserveTicketForm from '../forms/reserve/reserveTicketForm';
import ReserveSessionModel from '../models/reserve/session';

//const extraSeatNum: any = conf.get<any>('extra_seat_num');
const debug = createDebug('ttts-frontend:controller:reserveBase');
const DEFAULT_RADIX = 10;
const LENGTH_HOUR: number = 2;

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
    const checkInfo = await checkFixSeatsAndTickets(reservationModel, req);
    if (checkInfo.status === false) {
        throw new Error(checkInfo.message);
    }

    // 予約可能件数チェック+予約情報取得
    const infos = await getInfoFixSeatsAndTickets(reservationModel, req, Number(checkInfo.selectedCount) + Number(checkInfo.extraCount));
    if (infos.status === false) {
        throw new Error(infos.message);
    }

    // チケット情報に枚数セット(画面で選択された枚数<画面再表示用)
    reservationModel.ticketTypes.forEach((ticketType) => {
        const choice = checkInfo.choices.find((c: any) => (ticketType._id === c.ticket_type));
        ticketType.count = (choice !== undefined) ? Number(choice.ticket_count) : 0;
    });

    // セッション中の予約リストを初期化
    reservationModel.seatCodes = [];
    reservationModel.seatCodesExtra = [];
    reservationModel.expiredAt = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();

    // 予約情報更新(「仮予約:TEMPORARY」にアップデートする処理を枚数分実行)
    let updateCountTotal: number = 0;
    const promises = checkInfo.choicesAll.map(async(choiceInfo: any) => {
        const updateCount = await saveDbFixSeatsAndTickets(
            reservationModel,
            req,
            choiceInfo);
        updateCountTotal += updateCount;
    });
    await Promise.all(promises);

    // 予約枚数が指定枚数に達しなかった時,予約可能に戻す
    if (updateCountTotal < Number(checkInfo.selectedCount) + Number(checkInfo.extraCount)) {
        await processCancelSeats(reservationModel);
        // "予約可能な席がございません"
        throw new Error(req.__('NoAvailableSeats'));
    }
}
/**
 * 座席・券種FIXプロセス/検証処理
 *
 * @param {ReservationModel} reservationModel
 * @param {Request} req
 * @returns {Promise<void>}
 */
async function checkFixSeatsAndTickets(reservationModel: ReserveSessionModel,
                                       req: Request) : Promise<any> {
    const checkInfo : any = {
        status: false,
        choices: null,
        choicesAll: [],
        selectedCount: 0,
        extraCount: 0,
        message: ''
    };
    // 検証(券種が選択されていること)
    reserveTicketForm(req);
    const validationResult = await req.getValidationResult();
    if (!validationResult.isEmpty()) {
        checkInfo.message =  req.__('Invalid"');

        return checkInfo;
    }
    // 画面から座席選択情報が生成できなければエラー
    const choices = JSON.parse(req.body.choices);
    if (!Array.isArray(choices)) {
        checkInfo.message =  req.__('UnexpectedError');

        return checkInfo;
    }
    checkInfo.choices = choices;

    // 特殊チケット情報
    const extraSeatNum: any = {};
    reservationModel.ticketTypes.forEach((ticketTypeInArray) => {
        if (ticketTypeInArray.ttts_extension.category !== TicketTypeGroupUtil.TICKET_TYPE_CATEGORY_NORMAL) {
            extraSeatNum[ticketTypeInArray._id] = ticketTypeInArray.ttts_extension.required_seat_num;
        }
    });

    // チケット枚数合計計算
    choices.forEach((choice: any) => {
        // チケットセット(選択枚数分)
        checkInfo.selectedCount += Number(choice.ticket_count);
        for (let index = 0; index < Number(choice.ticket_count); index += 1) {
            const choiceInfo: any = {
                ticket_type : (<any>choice).ticket_type,
                ticketCount: 1,
                choicesExtra: [],
                updated: false
            };
            // 特殊の時、必要枚数分セット
            if (extraSeatNum.hasOwnProperty((<any>choice).ticket_type)) {
                const extraCount: number = Number(extraSeatNum[(<any>choice).ticket_type]) - 1;
                for (let indexExtra = 0; indexExtra < extraCount; indexExtra += 1) {
                    choiceInfo.choicesExtra.push({
                        ticket_type : (<any>choice).ticket_type,
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
        info.message = req.__('NoAvailableSeats');

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
        info.message = req.__('NoAvailableSeats');

        return info;
    }
    info.status = true;

    return info;
}

/**
 * 座席・券種FIXプロセス/予約情報をDBにsave(仮予約)
 *
 * @param {ReservationModel} reservationModel
 * @param {Request} req
 * @param {any[]} choices
 * @param {string} status
 * @returns {Promise<number>}
 */
async function saveDbFixSeatsAndTickets(reservationModel: ReserveSessionModel,
                                        req: Request,
                                        choiceInfo: any): Promise<number> {
    // チケット情報
    // tslint:disable-next-line:max-line-length
    const ticketType = reservationModel.ticketTypes.find((ticketTypeInArray) => (ticketTypeInArray._id === choiceInfo.ticket_type));
    if (ticketType === undefined) {
        throw new Error(req.__('UnexpectedError'));
    }

    // 予約情報更新キーセット(パフォーマンス,'予約可能')
    const updateKey = {
        performance: reservationModel.performance._id,
        status: ReservationUtil.STATUS_AVAILABLE
    };
    let updateCount: number = 0;

    // 本体分の予約更新('予約可能'を'仮予約'に変更)
    let reservation = await updateReservation(updateKey,
                                              ReservationUtil.STATUS_TEMPORARY,
                                              reservationModel.expiredAt,
                                              '',
                                              ticketType);
    if (reservation === null) {

        return 0;
    }
    // 座席番号取得＆Save
    const seatCodeBase: string = reservation.seat_code;
    reservation = await Models.Reservation.findByIdAndUpdate(
        { _id : reservation._id },
        { $set: { reservation_ttts_extension: getReservationExtension(seatCodeBase) }},
        { new: true }
    ).exec();
    if (reservation === null) {

        return 0;
    }

    // 2017/11 時間ごとの予約情報更新
    if (ticketType.ttts_extension.category !== TicketTypeGroupUtil.TICKET_TYPE_CATEGORY_NORMAL) {
        if (!(await updateReservationPerHour(reservation._id.toString(),
                                             reservationModel.expiredAt,
                                             ticketType,
                                             reservationModel.performance))) {
            // 更新済の予約データクリア
            await Models.Reservation.findByIdAndUpdate(
                { _id: reservation._id },
                { $set: { status: ReservationUtil.STATUS_AVAILABLE },
                  $unset: { payment_no: 1, ticket_type: 1, expired_at: 1, ticket_ttts_extension: 1, reservation_ttts_extension: 1}},
                { new: true }
            ).exec();

            return 0;
        }
    }

    // チケット情報+座席情報をセッションにsave
    saveSessionFixSeatsAndTickets(req,
                                  reservationModel,
                                  reservation,
                                  ticketType,
                                  ReservationUtil.STATUS_TEMPORARY);
    updateCount += 1;

    // 余分確保分の予約更新
    const promises = choiceInfo.choicesExtra.map(async() => {
        // '予約可能'を'仮予約'に変更('予約可能'を'仮予約'に変更)
        const reservationExtra = await updateReservation(updateKey,
                                                         ReservationUtil.STATUS_TEMPORARY_FOR_SECURE_EXTRA,
                                                         reservationModel.expiredAt,
                                                         seatCodeBase,
                                                         ticketType);

        // 更新エラー(対象データなし):次のseatへ
        if (reservationExtra !== null) {
            updateCount = updateCount + 1;
            // チケット情報+座席情報をセッションにsave
            saveSessionFixSeatsAndTickets(req,
                                          reservationModel,
                                          reservationExtra,
                                          ticketType,
                                          ReservationUtil.STATUS_TEMPORARY_FOR_SECURE_EXTRA);
        }
    });
    await Promise.all(promises);

    return updateCount;
}
/**
 * 予約拡張情報の更新情報取得
 *
 * @param {string} seatCodeBase
 * @returns {any}
 */
function getReservationExtension (seatCodeBase: string): any {

    return {
        seat_code_base : seatCodeBase //,
        // refund_status: PerformanceUtil.REFUND_STATUS.NONE,
        // refund_update_user: ''
    };
}
/**
 * 座席・券種FIXプロセス/予約情報をDBにsave(仮予約)
 *
 * @param {string} reservationId
 * @param {any} expiredAt
 * @param {string} ticketType
 * @param {string} performance
 * @returns {Promise<boolean>}
 */
async function updateReservationPerHour (reservationId: string,
                                         expiredAt: any,
                                         ticketType: any,
                                         performance: any): Promise<boolean> {
    // 更新キー(入塔日＋時間帯)
    const updateKey = {
        performance_day: performance.day,
        performance_hour: performance.start_time.slice(0, LENGTH_HOUR),
        ticket_category: ticketType.ttts_extension.category,
        status: ReservationUtil.STATUS_AVAILABLE
    };

    // 更新内容セット
    const updateData: any = {
        status: ReservationUtil.STATUS_TEMPORARY,
        expired_at: expiredAt,
        reservation_id: reservationId
    };

    // '予約可能'を'仮予約'に変更
    const reservation = await Models.ReservationPerHour.findOneAndUpdate(
        updateKey,
        updateData,
        {
            new: true
        }
    ).exec();
    // 更新エラー(対象データなし):既に予約済
    if (reservation === null) {
        debug('update hour error');
        // tslint:disable-next-line:no-console
        console.log('update hour error');
    } else {
        // tslint:disable-next-line:no-console
        console.log((<any>reservation)._id);
    }

    return reservation !== null;
}
/**
 * 座席・券種FIXプロセス/予約情報をDBにsave(仮予約)
 *
 * @param {any} updateKey
 * @param {string} status
 * @param {any} expiredAt
 * @param {string} seatCodeBase
 * @param {string} ticketType
 * @returns {Promise<void>}
 */
async function updateReservation (updateKey: any,
                                  status: string,
                                  expiredAt: any,
                                  seatCodeBase: string,
                                  ticketType: any): Promise<any> {

    // 更新内容セット
    const updateData: any = {
        status: status,
        expired_at: expiredAt,
        ticket_ttts_extension: ticketType.ttts_extension ,
        reservation_ttts_extension: getReservationExtension(seatCodeBase)
    };
    // '予約可能'を'仮予約'に変更
    const reservation = await Models.Reservation.findOneAndUpdate(
        updateKey,
        updateData,
        {
            new: true
        }
    ).exec();

    // 更新エラー(対象データなし):次のseatへ
    if (reservation === null) {
        debug('update error');
        // tslint:disable-next-line:no-console
        console.log('update error');
    } else {
        // tslint:disable-next-line:no-console
        console.log((<any>reservation).seat_code);
    }

    return reservation;
}

/**
 * 座席・券種FIXプロセス/予約情報をセッションにsave
 *
 * @param {ReservationModel} reservationModel
 * @param {Request} req
 * @param {any} result
 * @param {any} ticketType
 * @param {string} status
 * @returns {Promise<void>}
 */
function saveSessionFixSeatsAndTickets(req: Request,
                                       reservationModel: ReserveSessionModel,
                                       result: any,
                                       ticketType: any,
                                       status: string) : void {
    // 座席情報
    const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => (seat.code === result.seat_code));
    if (seatInfo === undefined) {
        throw new Error(req.__('Invalid"SeatCode'));
    }
    // セッションに保管
    // 2017/07/08 特殊チケット対応
    status === ReservationUtil.STATUS_TEMPORARY ?
        reservationModel.seatCodes.push(result.seat_code) :
        reservationModel.seatCodesExtra.push(result.seat_code);

    reservationModel.setReservation(result.seat_code, {
        _id : result._id,
        status : result.status,
        seat_code : result.seat_code,
        seat_grade_name : seatInfo.grade.name,
        seat_grade_additional_charge : seatInfo.grade.additional_charge,
        ticket_type : ticketType._id,
        ticket_type_name : ticketType.name,
        ticket_type_charge : ticketType.charge,
        watcher_name: '',
        ticket_cancel_charge: ticketType.cancel_charge,
        ticket_ttts_extension: ticketType.ttts_extension,
        performance_ttts_extension: reservationModel.performance.ttts_extension // 2017/11/16
    });
    // 座席コードのソート(文字列順に)
    reservationModel.seatCodes.sort(ScreenUtil.sortBySeatCode);

    return;
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
    const idsExtra = reservationModel.getReservationIdsExtra();
    Array.prototype.push.apply(ids, idsExtra);
    if (ids.length > 0) {
        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        // 仮予約を空席ステータスに戻す
        // 2017/05 予約レコード削除からSTATUS初期化へ変更
        const promises = ids.map(async (id: any) => {
            try {
                await Models.Reservation.findByIdAndUpdate(
                    { _id: id },
                    {
                         $set: { status: ReservationUtil.STATUS_AVAILABLE },
                         $unset: { payment_no: 1, ticket_type: 1, expired_at: 1, ticket_ttts_extension: 1, reservation_ttts_extension: 1}
                    },
                    {
                        new: true
                    }
                ).exec();
            } catch (error) {
                //失敗したとしても時間経過で消るので放置
            }
        });
        await Promise.all(promises);
        // 2017/11 時間ごとの予約レコードのSTATUS初期化
        const promisesHour = ids.map(async (id: any) => {
            if (idsExtra.indexOf(id) < 0) {
                try {
                    await Models.ReservationPerHour.findOneAndUpdate(
                        { reservation_id: id },
                        {
                             $set: { status: ReservationUtil.STATUS_AVAILABLE },
                             $unset: { expired_at: 1, reservation_id: 1}
                        },
                        {
                            new: true
                        }
                    ).exec();
                } catch (error) {
                    //失敗したとしても時間経過で消るので放置
                }
            }
        });
        await Promise.all(promisesHour);
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
        'day open_time start_time end_time canceled film screen screen_name theater theater_name ticket_type_group ttts_extension'
        )
        .populate('film', 'name is_mx4d copyright') // 必要な項目だけ指定すること
        .populate('screen', 'name sections') // 必要な項目だけ指定すること
        .populate('theater', 'name address') // 必要な項目だけ指定すること
        .exec();

    if (performance === null) {
        throw new Error(req.__('NotFound'));
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
    // 2017/06/19 upsate node+typesctipt
    if (ticketTypeGroup !== null) {
        reservationModel.ticketTypes = ticketTypeGroup.get('ticket_types');
    }
    //reservationModel.ticketTypes = ticketTypeGroup.get('ticket_types');
    //---

    reservationModel.seatCodes = [];

    // パフォーマンス情報を保管
    const tttsExtension: any = performance.get('ttts_extension');
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
        },
        ttts_extension: {
            tour_number: tttsExtension.tour_number,
            refund_update_user : '',
            refund_status : PerformanceUtil.REFUND_STATUS.NONE
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

    // スクリーン座席表HTMLを保管(TTTS未使用)
    reservationModel.screenHtml = '';

    // この時点でトークンに対して購入番号発行(上映日が決まれば購入番号を発行できる)
    reservationModel.paymentNo = await ReservationUtil.publishPaymentNo(reservationModel.performance.day);
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
    // 2017/07/08 特殊チケット対応
    const seatCodesAll: string[] = Array.prototype.concat(reservationModel.seatCodes, reservationModel.seatCodesExtra);
    // いったん全情報をDBに保存
    //await Promise.all(reservationModel.seatCodes.map(async (seatCode, index) => {
    await Promise.all(seatCodesAll.map(async (seatCode, index) => {
        let update = reservationModel.seatCode2reservationDocument(seatCode);
        // 2017/06/19 upsate node+typesctipt
        update = {...update, ...commonUpdate};
        //update = Object.assign(update, commonUpdate);
        //---
        (<any>update).payment_seat_index = index;
        // 予約情報更新
        const reservation = await Models.Reservation.findByIdAndUpdate(
            update._id,
            update,
            { new: true }
        ).exec();

        // IDの予約ドキュメントが万が一なければ予期せぬエラー(基本的にありえないフローのはず)
        if (reservation === null) {
            throw new Error(req.__('UnexpectedError'));
        }
    }));
}

/**
 * 購入番号から全ての予約を完了にする
 *
 * @param {string} paymentNo 購入番号
 * @param {Object} update 追加更新パラメータ
 */
export async function processFixReservations(reservationModel: ReserveSessionModel,
                                             performanceDay: string,
                                             paymentNo: string,
                                             update: any,
                                             res: Response): Promise<void> {
    (<any>update).purchased_at = moment().valueOf();
    (<any>update).status = ReservationUtil.STATUS_RESERVED;

    const conditions: any = {
        performance_day: performanceDay,
        payment_no: paymentNo,
        status: ReservationUtil.STATUS_TEMPORARY
    };
    // 予約完了ステータスへ変更
    await Models.Reservation.update(
        conditions,
        update,
        { multi: true } // 必須！複数予約ドキュメントを一度に更新するため
    ).exec();

    // 2017/07/08 特殊チケット対応
    // 特殊チケット一時予約を特殊チケット予約完了ステータスへ変更
    conditions.status = ReservationUtil.STATUS_TEMPORARY_FOR_SECURE_EXTRA;
    (<any>update).status = ReservationUtil.STATUS_ON_KEPT_FOR_SECURE_EXTRA;
    await Models.Reservation.update(
        conditions,
        update,
        { multi: true }
    ).exec();

    // 2017/11 本体チケット予約情報取得
    const reservations = getReservations(reservationModel);
    await Promise.all(reservations.map(async (reservation) => {
        // 2017/11 本体チケットかつ特殊(車椅子)チケットの時
        if (reservation.ticket_ttts_extension.category !== TicketTypeGroupUtil.TICKET_TYPE_CATEGORY_NORMAL) {
            // 時間ごとの予約情報更新('仮予約'を'予約'に変更)
            await Models.ReservationPerHour.findOneAndUpdate(
                { reservation_id: reservation._id.toString() },
                { status: ReservationUtil.STATUS_RESERVED },
                { new: true }
            ).exec();
        }
    }));

    try {
        // 完了メールキュー追加(あれば更新日時を更新するだけ)
        const emailQueue = await createEmailQueue(reservationModel, res, performanceDay, paymentNo);
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
async function createEmailQueue(reservationModel: ReserveSessionModel,
                                res: Response,
                                performanceDay: string,
                                paymentNo: string): Promise<IEmailQueue> {
    // 2017/07/10 特殊チケット対応(status: ReservationUtil.STATUS_RESERVED追加)
    const reservations: any[] = await Models.Reservation.find({
        status: ReservationUtil.STATUS_RESERVED,
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

    const title = res.__('Title');
    const titleEmail = res.__('EmailTitle');

    // 券種ごとに合計枚数算出
    const keyName: string = 'ticket_type';
    const ticketInfos: {} = {};
    for ( const reservation of reservations) {
        // チケットタイプセット
        const dataValue = reservation[keyName];
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
    // 券種ごとの表示情報編集
    const leaf: string = res.__('EmailLeaf');
    const ticketInfoArray: string[] = [];
    Object.keys(ticketInfos).forEach((key) => {
        const ticketInfo = (<any>ticketInfos)[key];
        ticketInfoArray.push(`${ticketInfo.ticket_type_name[res.locale]} ${ticketInfo.count}${leaf}`);
    });
    const day: string = moment(reservations[0].performance_day, 'YYYYMMDD').format('YYYY/MM/DD');
    // tslint:disable-next-line:no-magic-numbers
    const time: string = `${reservations[0].performance_start_time.substr(0, 2)}:${reservations[0].performance_start_time.substr(2, 2)}`;

    return new Promise<IEmailQueue>((resolve, reject) => {
        res.render(
            'email/reserve/complete',
            {
                layout: false,
                reservations: reservations,
                moment: moment,
                numeral: numeral,
                conf: conf,
                GMOUtil: GMO.Util,
                ReservationUtil: ReservationUtil,
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
                    status: EmailQueueUtil.STATUS_UNSENT
                };
                resolve(emailQueue);
            });
    });
}
/**
 * 予約情報取得(reservationModelから)
 *
 * @param {ReserveSessionModel} reservationModel
 * @returns {any[]}
 */
export  function getReservations(reservationModel: ReserveSessionModel): any[] {
    const reservations: any[] = [];
    reservationModel.seatCodes.forEach((seatCode) => {
        reservations.push(new Models.Reservation(reservationModel.seatCode2reservationDocument(seatCode)));
    });

    return reservations;
}
