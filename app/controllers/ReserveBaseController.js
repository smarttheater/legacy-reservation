"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const GMO = require("@motionpicture/gmo-service");
const conf = require("config");
const createDebug = require("debug");
const fs = require("fs-extra");
const moment = require("moment");
const numeral = require("numeral");
const _ = require("underscore");
const reservePaymentCreditForm_1 = require("../forms/reserve/reservePaymentCreditForm");
const reserveProfileForm_1 = require("../forms/reserve/reserveProfileForm");
const reserveTicketForm_1 = require("../forms/reserve/reserveTicketForm");
const session_1 = require("../models/reserve/session");
const BaseController_1 = require("./BaseController");
const debug = createDebug('chevre-frontend:controller:reserveBase');
const DEFAULT_RADIX = 10;
/**
 * 座席予約ベースコントローラー
 *
 * @export
 * @class ReserveBaseController
 * @extends {BaseController}
 */
class ReserveBaseController extends BaseController_1.default {
    constructor(req, res, next) {
        super(req, res, next);
        this.res.locals.GMOUtil = GMO.Util;
        this.res.locals.ReservationUtil = chevre_domain_1.ReservationUtil;
        this.res.locals.ScreenUtil = chevre_domain_1.ScreenUtil;
        this.res.locals.Models = chevre_domain_1.Models;
    }
    /**
     * 券種FIXプロセス
     * @method processFixTickets
     * @param {ReservationModel} reservationModel
     * @returns {Promise<ReservationModel>}
     */
    processFixTickets(reservationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            reserveTicketForm_1.default(this.req);
            const validationResult = yield this.req.getValidationResult();
            if (!validationResult.isEmpty()) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }
            // 座席選択情報を保存して座席選択へ
            const choices = JSON.parse(this.req.body.choices);
            if (!Array.isArray(choices)) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }
            choices.forEach((choice) => {
                const ticketType = reservationModel.ticketTypes.find((ticketTypeInArray) => {
                    return (ticketTypeInArray._id === choice.ticket_type);
                });
                if (ticketType === undefined) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
                const reservation = reservationModel.getReservation(choice.seat_code);
                reservation.ticket_type = ticketType._id;
                reservation.ticket_type_name_ja = ticketType.name.ja;
                reservation.ticket_type_name_en = ticketType.name.en;
                reservation.ticket_type_charge = ticketType.charge;
                reservation.watcher_name = choice.watcher_name;
                reservationModel.setReservation(reservation.seat_code, reservation);
            });
            return reservationModel;
        });
    }
    /**
     * 購入者情報FIXプロセス
     * @method processFixProfile
     * @param {ReservationModel} reservationModel
     * @returns {Promise<ReservationModel>}
     */
    processFixProfile(reservationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            reserveProfileForm_1.default(this.req);
            const validationResult = yield this.req.getValidationResult();
            this.res.locals.validation = validationResult.mapped();
            this.res.locals.lastName = this.req.body.lastName;
            this.res.locals.firstName = this.req.body.firstName;
            this.res.locals.email = this.req.body.email;
            this.res.locals.emailConfirm = this.req.body.emailConfirm;
            this.res.locals.emailConfirmDomain = this.req.body.emailConfirmDomain;
            this.res.locals.tel = this.req.body.tel;
            this.res.locals.age = this.req.body.age;
            this.res.locals.address = this.req.body.address;
            this.res.locals.gender = this.req.body.gender;
            this.res.locals.paymentMethod = this.req.body.paymentMethod;
            if (!validationResult.isEmpty()) {
                throw new Error(this.req.__('Message.Invalid'));
            }
            // 購入者情報を保存して座席選択へ
            reservationModel.purchaserLastName = this.req.body.lastName;
            reservationModel.purchaserFirstName = this.req.body.firstName;
            reservationModel.purchaserEmail = this.req.body.email;
            reservationModel.purchaserTel = this.req.body.tel;
            reservationModel.purchaserAge = this.req.body.age;
            reservationModel.purchaserAddress = this.req.body.address;
            reservationModel.purchaserGender = this.req.body.gender;
            reservationModel.paymentMethod = this.req.body.paymentMethod;
            // 主体によっては、決済方法を強制的に固定で
            switch (this.purchaserGroup) {
                case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                    reservationModel.paymentMethod = '';
                    break;
                case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                    reservationModel.paymentMethod = GMO.Util.PAY_TYPE_CREDIT;
                    break;
                default:
                    break;
            }
            // セッションに購入者情報格納
            this.savePurchaser(this.req.body.lastName, this.req.body.firstName, this.req.body.tel, this.req.body.email, this.req.body.age, this.req.body.address, this.req.body.gender);
            return reservationModel;
        });
    }
    /**
     * 決済クレジットカードFIXプロセス
     * @method processFixPaymentOfCredit
     * @param {ReservationModel} reservationModel
     * @returns {Promise<void>}
     */
    processFixPaymentOfCredit(reservationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            reservePaymentCreditForm_1.default(this.req);
            const validationResult = yield this.req.getValidationResult();
            if (!validationResult.isEmpty()) {
                throw new Error(this.req.__('Message.Invalid'));
            }
            if (reservationModel.transactionGMO === undefined) {
                reservationModel.transactionGMO = {
                    orderId: '',
                    accessId: '',
                    accessPass: '',
                    amount: 0,
                    count: 0,
                    status: GMO.Util.STATUS_CREDIT_UNPROCESSED
                };
            }
            if (reservationModel.transactionGMO.status === GMO.Util.STATUS_CREDIT_AUTH) {
                //GMOオーソリ取消
                const alterTranIn = {
                    shopId: process.env.GMO_SHOP_ID,
                    shopPass: process.env.GMO_SHOP_PASS,
                    accessId: reservationModel.transactionGMO.accessId,
                    accessPass: reservationModel.transactionGMO.accessPass,
                    jobCd: GMO.Util.JOB_CD_VOID
                };
                yield GMO.CreditService.alterTran(alterTranIn);
            }
            // GMO取引作成
            reservationModel.transactionGMO.count += 1;
            const paymentNo = reservationModel.paymentNo;
            const digit = -2;
            const count = `00${reservationModel.transactionGMO.count}`.slice(digit);
            // オーダーID 予約日 + 上映日 + 購入番号 + オーソリカウント(2桁)
            const orderId = chevre_domain_1.ReservationUtil.createGMOOrderId(reservationModel.performance.day, paymentNo, count);
            const amount = reservationModel.getTotalCharge();
            const entryTranIn = {
                shopId: process.env.GMO_SHOP_ID,
                shopPass: process.env.GMO_SHOP_PASS,
                orderId: orderId,
                jobCd: GMO.Util.JOB_CD_AUTH,
                amount: amount
            };
            const transactionGMO = yield GMO.CreditService.entryTran(entryTranIn);
            const gmoTokenObject = JSON.parse(this.req.body.gmoTokenObject);
            // GMOオーソリ
            const execTranIn = {
                accessId: transactionGMO.accessId,
                accessPass: transactionGMO.accessPass,
                orderId: orderId,
                method: GMO.Util.METHOD_LUMP,
                token: gmoTokenObject.token
            };
            yield GMO.CreditService.execTran(execTranIn);
            reservationModel.transactionGMO.accessId = transactionGMO.accessId;
            reservationModel.transactionGMO.accessPass = transactionGMO.accessPass;
            reservationModel.transactionGMO.orderId = orderId;
            reservationModel.transactionGMO.amount = amount;
            reservationModel.transactionGMO.status = GMO.Util.STATUS_CREDIT_AUTH;
            return;
        });
    }
    /**
     * 購入開始プロセス
     *
     * @param {string} purchaserGroup 購入者区分
     */
    processStart() {
        return __awaiter(this, void 0, void 0, function* () {
            // パフォーマンス未指定であればパフォーマンス選択へ
            // パフォーマンス指定であれば座席へ
            // 言語も指定
            if (!_.isEmpty(this.req.query.locale)) {
                this.req.session.locale = this.req.query.locale;
            }
            else {
                this.req.session.locale = 'ja';
            }
            // 予約トークンを発行
            const token = chevre_domain_1.CommonUtil.createToken();
            let reservationModel = new session_1.default();
            reservationModel.token = token;
            reservationModel.purchaserGroup = this.purchaserGroup;
            reservationModel = this.initializePayment(reservationModel);
            try {
                if (!_.isEmpty(this.req.query.performance)) {
                    // パフォーマンス指定遷移の場合 パフォーマンスFIX
                    // tslint:disable-next-line:no-shadowed-variable
                    reservationModel = yield this.processFixPerformance(reservationModel, this.req.query.performance);
                }
            }
            catch (error) {
                console.error(error);
                throw new Error(this.req.__('Message.UnexpectedError'));
            }
            return reservationModel;
        });
    }
    /**
     * 購入情報を初期化する
     */
    initializePayment(reservationModel) {
        if (this.purchaserGroup === undefined) {
            throw new Error('purchaser group undefined.');
        }
        const purchaserFromSession = this.findPurchaser();
        reservationModel.purchaserLastName = '';
        reservationModel.purchaserFirstName = '';
        reservationModel.purchaserTel = '';
        reservationModel.purchaserEmail = '';
        reservationModel.purchaserAge = '';
        reservationModel.purchaserAddress = '';
        reservationModel.purchaserGender = '1';
        reservationModel.paymentMethodChoices = [];
        switch (this.purchaserGroup) {
            case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                if (purchaserFromSession !== undefined) {
                    reservationModel.purchaserLastName = purchaserFromSession.lastName;
                    reservationModel.purchaserFirstName = purchaserFromSession.firstName;
                    reservationModel.purchaserTel = purchaserFromSession.tel;
                    reservationModel.purchaserEmail = purchaserFromSession.email;
                    reservationModel.purchaserAge = purchaserFromSession.age;
                    reservationModel.purchaserAddress = purchaserFromSession.address;
                    reservationModel.purchaserGender = purchaserFromSession.gender;
                }
                reservationModel.paymentMethodChoices = [GMO.Util.PAY_TYPE_CREDIT, GMO.Util.PAY_TYPE_CVS];
                break;
            case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                if (purchaserFromSession !== undefined) {
                    reservationModel.purchaserLastName = purchaserFromSession.lastName;
                    reservationModel.purchaserFirstName = purchaserFromSession.firstName;
                    reservationModel.purchaserTel = purchaserFromSession.tel;
                    reservationModel.purchaserEmail = purchaserFromSession.email;
                    reservationModel.purchaserAge = purchaserFromSession.age;
                    reservationModel.purchaserAddress = purchaserFromSession.address;
                    reservationModel.purchaserGender = purchaserFromSession.gender;
                }
                reservationModel.paymentMethodChoices = [GMO.Util.PAY_TYPE_CREDIT];
                break;
            case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                if (this.req.staffUser === undefined)
                    throw new Error(this.req.__('Message.UnexpectedError'));
                reservationModel.purchaserLastName = 'ナイブ';
                reservationModel.purchaserFirstName = 'カンケイシャ';
                reservationModel.purchaserTel = '0362263025';
                reservationModel.purchaserEmail = this.req.staffUser.get('email');
                reservationModel.purchaserAge = '00';
                reservationModel.purchaserAddress = '';
                reservationModel.purchaserGender = '1';
                break;
            case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW:
                reservationModel.purchaserLastName = 'マドグチ';
                reservationModel.purchaserFirstName = 'タントウシャ';
                reservationModel.purchaserTel = '0362263025';
                reservationModel.purchaserEmail = 'chevre@localhost.net';
                reservationModel.purchaserAge = '00';
                reservationModel.purchaserAddress = '';
                reservationModel.purchaserGender = '1';
                reservationModel.paymentMethodChoices = [GMO.Util.PAY_TYPE_CREDIT, GMO.Util.PAY_TYPE_CASH];
                break;
            default:
                break;
        }
        return reservationModel;
    }
    /**
     * 予約フロー中の座席をキャンセルするプロセス
     *
     * @param {ReservationModel} reservationModel
     */
    // tslint:disable-next-line:prefer-function-over-method
    processCancelSeats(reservationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            const ids = reservationModel.getReservationIds();
            if (ids.length === 0) {
                return reservationModel;
            }
            // セッション中の予約リストを初期化
            reservationModel.seatCodes = [];
            // 仮予約を空席ステータスに戻す
            try {
                yield chevre_domain_1.Models.Reservation.remove({ _id: { $in: ids } }).exec();
            }
            catch (error) {
                // 失敗したとしても時間経過で消えるので放置
            }
            return reservationModel;
        });
    }
    /**
     * パフォーマンスをFIXするプロセス
     * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
     */
    // tslint:disable-next-line:max-func-body-length
    processFixPerformance(reservationModel, perfomanceId) {
        return __awaiter(this, void 0, void 0, function* () {
            // パフォーマンス取得
            const performance = yield chevre_domain_1.Models.Performance.findOne({
                _id: perfomanceId
            }, 'day open_time start_time end_time canceled film screen screen_name theater theater_name ticket_type_group' // 必要な項目だけ指定すること
            )
                .populate('film', 'name is_mx4d copyright') // 必要な項目だけ指定すること
                .populate('screen', 'name sections') // 必要な項目だけ指定すること
                .populate('theater', 'name address') // 必要な項目だけ指定すること
                .exec();
            if (performance === null) {
                throw new Error(this.req.__('Message.NotFound'));
            }
            if (performance.get('canceled') === true) {
                throw new Error(this.req.__('Message.OutOfTerm'));
            }
            // 内部と当日以外は、上映日当日まで購入可能
            if (this.purchaserGroup !== chevre_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW &&
                this.purchaserGroup !== chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF) {
                if (parseInt(performance.get('day'), DEFAULT_RADIX) < parseInt(moment().format('YYYYMMDD'), DEFAULT_RADIX)) {
                    throw new Error('You cannot reserve this performance.');
                }
            }
            // 券種取得
            const ticketTypeGroup = yield chevre_domain_1.Models.TicketTypeGroup.findOne({ _id: performance.get('ticket_type_group') }).populate('ticket_types').exec();
            reservationModel.seatCodes = [];
            // 券種リストは、予約する主体によって異なる
            // 内部関係者の場合
            switch (this.purchaserGroup) {
                case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                    reservationModel.ticketTypes = chevre_domain_1.TicketTypeGroupUtil.getOne4staff();
                    break;
                case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                    // メルマガ当選者の場合、一般だけ
                    reservationModel.ticketTypes = [];
                    for (const ticketType of ticketTypeGroup.get('ticket_types')) {
                        if (ticketType.get('_id') === chevre_domain_1.TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS) {
                            reservationModel.ticketTypes.push(ticketType);
                        }
                    }
                    break;
                default:
                    // 一般、当日窓口の場合
                    reservationModel.ticketTypes = [];
                    for (const ticketType of ticketTypeGroup.get('ticket_types')) {
                        switch (ticketType.get('_id')) {
                            // 学生当日は、当日だけ
                            case chevre_domain_1.TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY:
                                if (moment().format('YYYYMMDD') === performance.get('day')) {
                                    reservationModel.ticketTypes.push(ticketType);
                                }
                                break;
                            case chevre_domain_1.TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS:
                                if (moment().format('YYYYMMDD') !== performance.get('day')) {
                                    reservationModel.ticketTypes.push(ticketType);
                                }
                                break;
                            default:
                                reservationModel.ticketTypes.push(ticketType);
                                break;
                        }
                    }
                    break;
            }
            // パフォーマンス情報を保管
            reservationModel.performance = {
                _id: performance.get('_id'),
                day: performance.get('day'),
                open_time: performance.get('open_time'),
                start_time: performance.get('start_time'),
                end_time: performance.get('end_time'),
                start_str_ja: performance.get('start_str_ja'),
                start_str_en: performance.get('start_str_en'),
                location_str_ja: performance.get('location_str_ja'),
                location_str_en: performance.get('location_str_en'),
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
                    image: `${this.req.protocol}://${this.req.host}/images/film/${performance.get('film').get('_id')}.jpg`,
                    is_mx4d: performance.get('film').get('is_mx4d'),
                    copyright: performance.get('film').get('copyright')
                }
            };
            // 座席グレードリスト抽出
            reservationModel.seatGradeCodesInScreen = [];
            for (const seat of reservationModel.performance.screen.sections[0].seats) {
                if (reservationModel.seatGradeCodesInScreen.indexOf(seat.grade.code) < 0) {
                    reservationModel.seatGradeCodesInScreen.push(seat.grade.code);
                }
            }
            // コンビニ決済はパフォーマンス上映の5日前まで
            // tslint:disable-next-line:no-magic-numbers
            const day5DaysAgo = parseInt(moment().add(+5, 'days').format('YYYYMMDD'), DEFAULT_RADIX);
            if (parseInt(reservationModel.performance.day, DEFAULT_RADIX) < day5DaysAgo) {
                if (reservationModel.paymentMethodChoices.indexOf(GMO.Util.PAY_TYPE_CVS) >= 0) {
                    reservationModel.paymentMethodChoices.splice(reservationModel.paymentMethodChoices.indexOf(GMO.Util.PAY_TYPE_CVS), 1);
                }
            }
            // スクリーン座席表HTMLを保管
            reservationModel.screenHtml = fs.readFileSync(`${__dirname}/../views/_screens/${performance.get('screen').get('_id').toString()}.ejs`, 'utf8');
            // この時点でトークンに対して購入番号発行(上映日が決まれば購入番号を発行できる)
            reservationModel.paymentNo = yield chevre_domain_1.ReservationUtil.publishPaymentNo(reservationModel.performance.day);
            return reservationModel;
        });
    }
    /**
     * 座席をFIXするプロセス
     * 新規仮予約 ここが今回の肝です！！！
     *
     * @param {ReservationModel} reservationModel
     * @param {Array<string>} seatCodes
     */
    processFixSeats(reservationModel, seatCodes) {
        return __awaiter(this, void 0, void 0, function* () {
            // セッション中の予約リストを初期化
            reservationModel.seatCodes = [];
            reservationModel.expiredAt = moment().add(conf.get('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();
            // 新たな座席指定と、既に仮予約済みの座席コードについて
            const promises = seatCodes.map((seatCode) => __awaiter(this, void 0, void 0, function* () {
                const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                    return (seat.code === seatCode);
                });
                // 万が一、座席が存在しなかったら
                if (seatInfo === undefined) {
                    throw new Error(this.req.__('Message.InvalidSeatCode'));
                }
                const newReservation = {
                    performance: reservationModel.performance._id,
                    seat_code: seatCode,
                    status: chevre_domain_1.ReservationUtil.STATUS_TEMPORARY,
                    expired_at: reservationModel.expiredAt,
                    staff: undefined,
                    member: undefined,
                    tel: undefined,
                    window: undefined
                };
                switch (this.purchaserGroup) {
                    case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                        newReservation.staff = this.req.staffUser.get('_id');
                        break;
                    case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                        newReservation.member = this.req.memberUser.get('_id');
                        break;
                    case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW:
                        newReservation.window = this.req.windowUser.get('_id');
                        break;
                    default:
                        break;
                }
                // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
                const reservation = yield chevre_domain_1.Models.Reservation.create(newReservation);
                // ステータス更新に成功したらセッションに保管
                reservationModel.seatCodes.push(seatCode);
                reservationModel.setReservation(seatCode, {
                    _id: reservation.get('_id'),
                    status: reservation.get('status'),
                    seat_code: reservation.get('seat_code'),
                    seat_grade_name_ja: seatInfo.grade.name.ja,
                    seat_grade_name_en: seatInfo.grade.name.en,
                    seat_grade_additional_charge: seatInfo.grade.additional_charge,
                    ticket_type: '',
                    ticket_type_name_ja: '',
                    ticket_type_name_en: '',
                    ticket_type_charge: 0,
                    watcher_name: ''
                });
            }));
            yield Promise.all(promises);
            // 座席コードのソート(文字列順に)
            reservationModel.seatCodes.sort(chevre_domain_1.ScreenUtil.sortBySeatCode);
            return reservationModel;
        });
    }
    /**
     * 予約情報を確定してDBに保存するプロセス
     */
    // tslint:disable-next-line:max-func-body-length
    processConfirm(reservationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            // 仮押さえ有効期限チェック
            if (reservationModel.expiredAt !== undefined && reservationModel.expiredAt < moment().valueOf()) {
                throw new Error(this.res.__('Message.Expired'));
            }
            if (reservationModel.paymentNo === undefined) {
                console.error('paymentNo undefined');
                throw new Error(this.req.__('Message.UnexpectedError'));
            }
            // 購入日時確定
            reservationModel.purchasedAt = moment().valueOf();
            const commonUpdate = {
                // 決済移行のタイミングで仮予約有効期限を更新
                expired_at: moment().add(conf.get('temporary_reservation_valid_period_seconds'), 'seconds').valueOf()
            };
            switch (this.purchaserGroup) {
                case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                    // GMO決済の場合、この時点で決済中ステータスに変更
                    commonUpdate.status = chevre_domain_1.ReservationUtil.STATUS_WAITING_SETTLEMENT;
                    commonUpdate.expired_at = null;
                    // クレジット決済
                    if (reservationModel.paymentMethod === GMO.Util.PAY_TYPE_CREDIT) {
                        commonUpdate.gmo_shop_id = process.env.GMO_SHOP_ID;
                        commonUpdate.gmo_shop_pass = process.env.GMO_SHOP_PASS;
                        commonUpdate.gmo_order_id = reservationModel.transactionGMO.orderId;
                        commonUpdate.gmo_amount = reservationModel.transactionGMO.amount;
                        commonUpdate.gmo_access_id = reservationModel.transactionGMO.accessId;
                        commonUpdate.gmo_access_pass = reservationModel.transactionGMO.accessPass;
                        commonUpdate.gmo_status = GMO.Util.STATUS_CREDIT_AUTH;
                    }
                    break;
                case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                    commonUpdate.member = this.req.memberUser.get('_id');
                    commonUpdate.member_user_id = this.req.memberUser.get('user_id');
                    break;
                case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                    commonUpdate.staff = this.req.staffUser.get('_id');
                    commonUpdate.staff_user_id = this.req.staffUser.get('user_id');
                    commonUpdate.staff_name = this.req.staffUser.get('name');
                    commonUpdate.staff_email = this.req.staffUser.get('email');
                    commonUpdate.staff_signature = this.req.staffUser.get('signature');
                    commonUpdate.purchaser_last_name = '';
                    commonUpdate.purchaser_first_name = '';
                    commonUpdate.purchaser_email = '';
                    commonUpdate.purchaser_tel = '';
                    commonUpdate.purchaser_age = '';
                    commonUpdate.purchaser_address = '';
                    commonUpdate.purchaser_gender = '';
                    break;
                case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW:
                    commonUpdate.window = this.req.windowUser.get('_id');
                    commonUpdate.window_user_id = this.req.windowUser.get('user_id');
                    commonUpdate.purchaser_last_name = '';
                    commonUpdate.purchaser_first_name = '';
                    commonUpdate.purchaser_email = '';
                    commonUpdate.purchaser_tel = '';
                    commonUpdate.purchaser_age = '';
                    commonUpdate.purchaser_address = '';
                    commonUpdate.purchaser_gender = '';
                    break;
                default:
                    throw new Error(this.req.__('Message.UnexpectedError'));
            }
            // いったん全情報をDBに保存
            const promises = reservationModel.seatCodes.map((seatCode, index) => __awaiter(this, void 0, void 0, function* () {
                let update = reservationModel.seatCode2reservationDocument(seatCode);
                update = Object.assign(update, commonUpdate);
                update.payment_seat_index = index;
                debug('updating reservation all infos...update:', update);
                const reservation = yield chevre_domain_1.Models.Reservation.findByIdAndUpdate(update._id, update, { new: true }).exec();
                debug('reservation updated.', reservation);
                if (reservation === null) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
            }));
            yield Promise.all(promises);
        });
    }
    /**
     * 購入番号から全ての予約を完了にする
     *
     * @param {string} paymentNo 購入番号
     * @param {Object} update 追加更新パラメータ
     */
    processFixReservations(performanceDay, paymentNo, update) {
        return __awaiter(this, void 0, void 0, function* () {
            update.status = chevre_domain_1.ReservationUtil.STATUS_RESERVED;
            update.updated_user = 'ReserveBaseController';
            // 予約完了ステータスへ変更
            debug('updating reservations by paymentNo...', paymentNo, update);
            const raw = yield chevre_domain_1.Models.Reservation.update({
                performance_day: performanceDay,
                payment_no: paymentNo
            }, update, { multi: true }).exec();
            debug('reservations updated.', raw);
            try {
                // 完了メールキュー追加(あれば更新日時を更新するだけ)
                const emailQueue = yield createEmailQueue(this.res, performanceDay, paymentNo);
                debug('creating reservationEmailCue...');
                yield chevre_domain_1.Models.EmailQueue.create(emailQueue);
                debug('reservationEmailCue created.');
            }
            catch (error) {
                console.error(error);
                // 失敗してもスルー(ログと運用でなんとかする)
            }
        });
    }
    /**
     * 購入者情報をセッションに保管する
     */
    savePurchaser(lastName, firstName, tel, email, age, address, gender) {
        this.req.session.purchaser = {
            lastName: lastName,
            firstName: firstName,
            tel: tel,
            email: email,
            age: age,
            address: address,
            gender: gender
        };
    }
    /**
     * 購入者情報をセッションから探す
     */
    findPurchaser() {
        return this.req.session.purchaser;
    }
}
exports.default = ReserveBaseController;
/**
 * 予約完了メールを作成する
 *
 * @memberOf ReserveBaseController
 */
function createEmailQueue(res, performanceDay, paymentNo) {
    return __awaiter(this, void 0, void 0, function* () {
        const reservations = yield chevre_domain_1.Models.Reservation.find({
            performance_day: performanceDay,
            payment_no: paymentNo
        }).exec();
        debug('reservations for email found.', reservations.length);
        if (reservations.length === 0) {
            throw new Error(`reservations of payment_no ${paymentNo} not found`);
        }
        let to = '';
        switch (reservations[0].get('purchaser_group')) {
            case chevre_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                to = reservations[0].get('staff_email');
                break;
            default:
                to = reservations[0].get('purchaser_email');
                break;
        }
        debug('to is', to);
        if (to.length === 0) {
            throw new Error('email to unknown');
        }
        const titleJa = 'CHEVRE_EVENT_NAMEチケット 購入完了のお知らせ';
        const titleEn = 'Notice of Completion of CHEVRE Ticket Purchase';
        // switch (cue.get('template')) {
        //     case ReservationEmailCueUtil.TEMPLATE_COMPLETE:
        //         dir = `${process.cwd()}/app/views/email/reserve/complete`;
        //         titleJa = 'CHEVRE_EVENT_NAMEチケット 購入完了のお知らせ';
        //         titleEn = 'Notice of Completion of CHEVRE Ticket Purchase';
        //         break;
        //     case ReservationEmailCueUtil.TEMPLATE_TEMPORARY:
        //         dir = `${process.cwd()}/app/views/email/reserve/waitingSettlement`;
        //         titleJa = 'CHEVRE_EVENT_NAMEチケット 仮予約完了のお知らせ';
        //         titleEn = 'Notice of Completion of Tentative Reservation for CHEVRE Tickets';
        //         break;
        //     default:
        //         throw new Error(`${cue.get('template')} not implemented.`);
        // }
        debug('rendering template...');
        return new Promise((resolve, reject) => {
            res.render('email/reserve/complete', {
                layout: false,
                title_ja: titleJa,
                title_en: titleEn,
                reservations: reservations,
                moment: moment,
                numeral: numeral,
                conf: conf,
                GMOUtil: GMO.Util,
                ReservationUtil: chevre_domain_1.ReservationUtil
            }, (renderErr, text) => __awaiter(this, void 0, void 0, function* () {
                debug('email template rendered.', renderErr);
                if (renderErr instanceof Error) {
                    reject(new Error('failed in rendering an email.'));
                    return;
                }
                const emailQueue = {
                    from: {
                        address: conf.get('email.from'),
                        name: conf.get('email.fromname')
                    },
                    to: {
                        address: to
                        // name: 'testto'
                    },
                    subject: `${titleJa} ${titleEn}`,
                    content: {
                        mimetype: 'text/plain',
                        text: text
                    },
                    status: chevre_domain_1.EmailQueueUtil.STATUS_UNSENT
                };
                resolve(emailQueue);
            }));
        });
    });
}
