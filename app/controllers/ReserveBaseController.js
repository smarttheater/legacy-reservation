"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const conf = require("config");
const fs = require("fs-extra");
const moment = require("moment");
const GMOUtil = require("../../common/Util/GMO/GMOUtil");
const Util = require("../../common/Util/Util");
const reserveProfileForm_1 = require("../forms/reserve/reserveProfileForm");
const reserveTicketForm_1 = require("../forms/reserve/reserveTicketForm");
const ReservationModel_1 = require("../models/Reserve/ReservationModel");
const BaseController_1 = require("./BaseController");
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
        this.res.locals.GMOUtil = GMOUtil;
        this.res.locals.ReservationUtil = ttts_domain_1.ReservationUtil;
        this.res.locals.ScreenUtil = ttts_domain_1.ScreenUtil;
        this.res.locals.Models = ttts_domain_2.Models;
    }
    /**
     * 購入開始プロセス
     *
     * @param {string} purchaserGroup 購入者区分
     */
    processStart(cb) {
        // パフォーマンス未指定であればパフォーマンス選択へ
        // パフォーマンス指定であれば座席へ
        // 言語も指定
        if (this.req.query.locale) {
            this.req.session.locale = this.req.query.locale;
        }
        else {
            this.req.session.locale = 'ja';
        }
        const performanceId = this.req.query.performance;
        // 予約トークンを発行
        const token = Util.createToken();
        let reservationModel = new ReservationModel_1.default();
        reservationModel.token = token;
        reservationModel.purchaserGroup = this.purchaserGroup;
        reservationModel = this.initializePayment(reservationModel);
        // この時点でトークンに対して購入番号を発行しておかないと、複数ウィンドウで購入番号がずれる可能性あり
        ttts_domain_1.ReservationUtil.publishPaymentNo((err, paymentNo) => {
            if (err || !paymentNo)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            reservationModel.paymentNo = paymentNo;
            // パフォーマンスFIX
            if (this.purchaserGroup === ttts_domain_1.ReservationUtil.PURCHASER_GROUP_SPONSOR && this.req.sponsorUser && this.req.sponsorUser.get('performance')) {
                // パフォーマンスFIX
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixPerformance(reservationModel, this.req.sponsorUser.get('performance'), (fixPerformanceErr, reservationModel) => {
                    cb(fixPerformanceErr, reservationModel);
                });
            }
            else if (performanceId) {
                // パフォーマンスFIX
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixPerformance(reservationModel, performanceId, (fixPerformanceErr, reservationModel) => {
                    cb(fixPerformanceErr, reservationModel);
                });
            }
            else {
                cb(null, reservationModel);
            }
        });
    }
    /**
     * 購入情報を初期化する
     */
    initializePayment(reservationModel) {
        if (!this.purchaserGroup)
            throw new Error('purchaser group undefined.');
        let purchaserFromSession = this.findPurchaser();
        reservationModel.purchaserLastName = '';
        reservationModel.purchaserFirstName = '';
        reservationModel.purchaserTel = '';
        reservationModel.purchaserEmail = '';
        reservationModel.purchaserAge = '';
        reservationModel.purchaserAddress = '';
        reservationModel.purchaserGender = '1';
        reservationModel.paymentMethodChoices = [];
        switch (this.purchaserGroup) {
            case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                purchaserFromSession = this.findPurchaser();
                if (purchaserFromSession) {
                    reservationModel.purchaserLastName = purchaserFromSession.lastName;
                    reservationModel.purchaserFirstName = purchaserFromSession.firstName;
                    reservationModel.purchaserTel = purchaserFromSession.tel;
                    reservationModel.purchaserEmail = purchaserFromSession.email;
                    reservationModel.purchaserAge = purchaserFromSession.age;
                    reservationModel.purchaserAddress = purchaserFromSession.address;
                    reservationModel.purchaserGender = purchaserFromSession.gender;
                }
                reservationModel.paymentMethodChoices = [GMOUtil.PAY_TYPE_CREDIT, GMOUtil.PAY_TYPE_CVS];
                break;
            case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                if (purchaserFromSession) {
                    reservationModel.purchaserLastName = purchaserFromSession.lastName;
                    reservationModel.purchaserFirstName = purchaserFromSession.firstName;
                    reservationModel.purchaserTel = purchaserFromSession.tel;
                    reservationModel.purchaserEmail = purchaserFromSession.email;
                    reservationModel.purchaserAge = purchaserFromSession.age;
                    reservationModel.purchaserAddress = purchaserFromSession.address;
                    reservationModel.purchaserGender = purchaserFromSession.gender;
                }
                reservationModel.paymentMethodChoices = [GMOUtil.PAY_TYPE_CREDIT];
                break;
            case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_SPONSOR:
                if (purchaserFromSession) {
                    reservationModel.purchaserLastName = purchaserFromSession.lastName;
                    reservationModel.purchaserFirstName = purchaserFromSession.firstName;
                    reservationModel.purchaserTel = purchaserFromSession.tel;
                    reservationModel.purchaserEmail = purchaserFromSession.email;
                    reservationModel.purchaserAge = purchaserFromSession.age;
                    reservationModel.purchaserAddress = purchaserFromSession.address;
                    reservationModel.purchaserGender = purchaserFromSession.gender;
                }
                break;
            case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                if (!this.req.staffUser)
                    throw new Error(this.req.__('Message.UnexpectedError'));
                reservationModel.purchaserLastName = 'ナイブ';
                reservationModel.purchaserFirstName = 'カンケイシャ';
                reservationModel.purchaserTel = '0362263025';
                reservationModel.purchaserEmail = this.req.staffUser.get('email');
                reservationModel.purchaserAge = '00';
                reservationModel.purchaserAddress = '';
                reservationModel.purchaserGender = '1';
                break;
            case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_TEL:
                reservationModel.purchaserLastName = '';
                reservationModel.purchaserFirstName = '';
                reservationModel.purchaserTel = '';
                reservationModel.purchaserEmail = 'tiff@localhost.net';
                reservationModel.purchaserAge = '00';
                reservationModel.purchaserAddress = '';
                reservationModel.purchaserGender = '1';
                reservationModel.paymentMethodChoices = [GMOUtil.PAY_TYPE_CVS];
                break;
            case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW:
                reservationModel.purchaserLastName = 'マドグチ';
                reservationModel.purchaserFirstName = 'タントウシャ';
                reservationModel.purchaserTel = '0362263025';
                reservationModel.purchaserEmail = 'tiff@localhost.net';
                reservationModel.purchaserAge = '00';
                reservationModel.purchaserAddress = '';
                reservationModel.purchaserGender = '1';
                reservationModel.paymentMethodChoices = [GMOUtil.PAY_TYPE_CREDIT, GMOUtil.PAY_TYPE_CASH];
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
    processCancelSeats(reservationModel, cb) {
        const ids = reservationModel.getReservationIds();
        if (ids.length === 0)
            return cb(null, reservationModel);
        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        // 仮予約を空席ステータスに戻す
        ttts_domain_2.Models.Reservation.remove({
            _id: { $in: ids }
        }, () => {
            // 失敗したとしても時間経過で消えるので放置
            cb(null, reservationModel);
        });
    }
    /**
     * パフォーマンスをFIXするプロセス
     * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
     */
    // tslint:disable-next-line:max-func-body-length
    processFixPerformance(reservationModel, perfomanceId, cb) {
        // パフォーマンス取得
        ttts_domain_2.Models.Performance.findOne({
            _id: perfomanceId
        }, 'day open_time start_time end_time canceled film screen screen_name theater theater_name' // 必要な項目だけ指定すること
        )
            .populate('film', 'name ticket_type_group is_mx4d copyright') // 必要な項目だけ指定すること
            .populate('screen', 'name sections') // 必要な項目だけ指定すること
            .populate('theater', 'name address') // 必要な項目だけ指定すること
            .exec((err, performance) => {
            if (err)
                return cb(err, reservationModel);
            if (!performance)
                return cb(new Error(this.req.__('Message.NotFound')), reservationModel);
            if (performance.get('canceled'))
                return cb(new Error(this.req.__('Message.OutOfTerm')), reservationModel); // 万が一上映中止だった場合
            // 内部と当日以外は、上映日当日まで購入可能
            if (this.purchaserGroup !== ttts_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW
                && this.purchaserGroup !== ttts_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF) {
                if (parseInt(performance.get('day'), DEFAULT_RADIX) < parseInt(moment().format('YYYYMMDD'), DEFAULT_RADIX)) {
                    return cb(new Error('You cannot reserve this performance.'), reservationModel);
                }
            }
            // 券種取得
            ttts_domain_2.Models.TicketTypeGroup.findOne({ _id: performance.get('film').get('ticket_type_group') }, 
            // tslint:disable-next-line:max-func-body-length
            (findTicketTypeErr, ticketTypeGroup) => {
                if (findTicketTypeErr)
                    return cb(findTicketTypeErr, reservationModel);
                reservationModel.seatCodes = [];
                // 券種リストは、予約する主体によって異なる
                // 内部関係者の場合
                switch (this.purchaserGroup) {
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                        reservationModel.ticketTypes = ttts_domain_1.TicketTypeGroupUtil.getOne4staff();
                        break;
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_SPONSOR:
                        reservationModel.ticketTypes = ttts_domain_1.TicketTypeGroupUtil.getOne4sponsor();
                        break;
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                        // メルマガ当選者の場合、一般だけ
                        reservationModel.ticketTypes = [];
                        for (const ticketType of ticketTypeGroup.get('types')) {
                            if (ticketType.get('code') === ttts_domain_1.TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS) {
                                reservationModel.ticketTypes.push(ticketType);
                            }
                        }
                        break;
                    default:
                        // 一般、当日窓口、電話予約の場合
                        reservationModel.ticketTypes = [];
                        for (const ticketType of ticketTypeGroup.get('types')) {
                            switch (ticketType.get('code')) {
                                // 学生当日は、当日だけ
                                case ttts_domain_1.TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY:
                                    if (moment().format('YYYYMMDD') === performance.get('day')) {
                                        reservationModel.ticketTypes.push(ticketType);
                                    }
                                    break;
                                case ttts_domain_1.TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS:
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
                        image: `${this.req.protocol}://${conf.get('dns_name')}/images/film/${performance.get('film').get('_id')}.jpg`,
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
                if (parseInt(moment().add(+5, 'days').format('YYYYMMDD'), DEFAULT_RADIX) > parseInt(reservationModel.performance.day, DEFAULT_RADIX)) {
                    if (reservationModel.paymentMethodChoices.indexOf(GMOUtil.PAY_TYPE_CVS) >= 0) {
                        reservationModel.paymentMethodChoices.splice(reservationModel.paymentMethodChoices.indexOf(GMOUtil.PAY_TYPE_CVS), 1);
                    }
                }
                // スクリーン座席表HTMLを保管
                fs.readFile(`${__dirname}/../../common/views/screens/${performance.get('screen').get('_id').toString()}.ejs`, 'utf8', (readFileErr, data) => {
                    if (readFileErr) {
                        cb(readFileErr, reservationModel);
                    }
                    else {
                        reservationModel.screenHtml = data;
                        cb(null, reservationModel);
                    }
                });
            });
        });
    }
    /**
     * 座席をFIXするプロセス
     * 新規仮予約 ここが今回の肝です！！！
     *
     * @param {ReservationModel} reservationModel
     * @param {Array<string>} seatCodes
     */
    processFixSeats(reservationModel, seatCodes, cb) {
        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        reservationModel.expiredAt = moment().add(conf.get('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();
        // 新たな座席指定と、既に仮予約済みの座席コードについて
        const promises = seatCodes.map((seatCode) => {
            return new Promise((resolve, reject) => {
                const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                    return (seat.code === seatCode);
                });
                // 万が一、座席が存在しなかったら
                if (!seatInfo)
                    return reject(new Error(this.req.__('Message.InvalidSeatCode')));
                const newReservation = {
                    performance: reservationModel.performance._id,
                    seat_code: seatCode,
                    status: ttts_domain_1.ReservationUtil.STATUS_TEMPORARY,
                    expired_at: reservationModel.expiredAt,
                    staff: (this.purchaserGroup === ttts_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF && this.req.staffUser) ? this.req.staffUser.get('_id') : undefined,
                    sponsor: (this.purchaserGroup === ttts_domain_1.ReservationUtil.PURCHASER_GROUP_SPONSOR && this.req.sponsorUser) ? this.req.sponsorUser.get('_id') : undefined,
                    member: (this.purchaserGroup === ttts_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER && this.req.memberUser) ? this.req.memberUser.get('_id') : undefined,
                    tel: (this.purchaserGroup === ttts_domain_1.ReservationUtil.PURCHASER_GROUP_TEL && this.req.telStaffUser) ? this.req.telStaffUser.get('_id') : undefined,
                    window: (this.purchaserGroup === ttts_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW && this.req.windowUser) ? this.req.windowUser.get('_id') : undefined,
                    pre_customer: (this.purchaserGroup === ttts_domain_1.ReservationUtil.PURCHASER_GROUP_CUSTOMER && this.req.preCustomerUser) ? this.req.preCustomerUser.get('_id') : undefined
                };
                // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
                ttts_domain_2.Models.Reservation.create(newReservation, (err, reservation) => {
                    if (err)
                        return reject(err);
                    // ステータス更新に成功したらセッションに保管
                    reservationModel.seatCodes.push(seatCode);
                    reservationModel.setReservation(seatCode, {
                        _id: reservation.get('_id'),
                        status: reservation.get('status'),
                        seat_code: reservation.get('seat_code'),
                        seat_grade_name_ja: seatInfo.grade.name.ja,
                        seat_grade_name_en: seatInfo.grade.name.en,
                        seat_grade_additional_charge: seatInfo.grade.additional_charge,
                        ticket_type_code: '',
                        ticket_type_name_ja: '',
                        ticket_type_name_en: '',
                        ticket_type_charge: 0,
                        watcher_name: ''
                    });
                    resolve();
                });
            });
        });
        Promise.all(promises).then(() => {
            // 座席コードのソート(文字列順に)
            reservationModel.seatCodes.sort(ttts_domain_1.ScreenUtil.sortBySeatCode);
            cb(null, reservationModel);
        }, (err) => {
            cb(err, reservationModel);
        });
    }
    /**
     * 券種FIXプロセス
     */
    processFixTickets(reservationModel, cb) {
        reserveTicketForm_1.default(this.req, this.res, () => {
            if (!this.req.form)
                return cb(new Error(this.req.__('Message.UnexpectedError')), reservationModel);
            if (!this.req.form.isValid)
                return cb(new Error(this.req.__('Message.UnexpectedError')), reservationModel);
            // 座席選択情報を保存して座席選択へ
            const choices = JSON.parse(this.req.form.choices);
            if (!Array.isArray(choices))
                return cb(new Error(this.req.__('Message.UnexpectedError')), reservationModel);
            choices.forEach((choice) => {
                const ticketType = reservationModel.ticketTypes.find((ticketTypeInArray) => {
                    return (ticketTypeInArray.code === choice.ticket_type_code);
                });
                if (!ticketType)
                    throw new Error(this.req.__('Message.UnexpectedError'));
                const reservation = reservationModel.getReservation(choice.seat_code);
                reservation.ticket_type_code = ticketType.code;
                reservation.ticket_type_name_ja = ticketType.name.ja;
                reservation.ticket_type_name_en = ticketType.name.en;
                reservation.ticket_type_charge = ticketType.charge;
                reservation.watcher_name = choice.watcher_name;
                reservationModel.setReservation(reservation.seat_code, reservation);
            });
            cb(null, reservationModel);
        });
    }
    /**
     * 券種FIXプロセス
     */
    processFixProfile(reservationModel, cb) {
        const form = reserveProfileForm_1.default(this.req);
        form(this.req, this.res, (err) => {
            if (err)
                return cb(new Error(this.req.__('Message.UnexpectedError')), reservationModel);
            if (!this.req.form)
                return cb(new Error(this.req.__('Message.UnexpectedError')), reservationModel);
            if (!this.req.form.isValid)
                return cb(new Error(this.req.__('Message.Invalid')), reservationModel);
            // 購入者情報を保存して座席選択へ
            reservationModel.purchaserLastName = this.req.form.lastName;
            reservationModel.purchaserFirstName = this.req.form.firstName;
            reservationModel.purchaserEmail = this.req.form.email;
            reservationModel.purchaserTel = this.req.form.tel;
            reservationModel.purchaserAge = this.req.form.age;
            reservationModel.purchaserAddress = this.req.form.address;
            reservationModel.purchaserGender = this.req.form.gender;
            reservationModel.paymentMethod = this.req.form.paymentMethod;
            // 主体によっては、決済方法を強制的に固定で
            switch (this.purchaserGroup) {
                case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_SPONSOR:
                case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
                    reservationModel.paymentMethod = '';
                    break;
                case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_TEL:
                    reservationModel.paymentMethod = GMOUtil.PAY_TYPE_CVS;
                    break;
                case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                    reservationModel.paymentMethod = GMOUtil.PAY_TYPE_CREDIT;
                    break;
                default:
                    break;
            }
            // セッションに購入者情報格納
            this.savePurchaser(this.req.form.lastName, this.req.form.firstName, this.req.form.tel, this.req.form.email, this.req.form.age, this.req.form.address, this.req.form.gender);
            cb(null, reservationModel);
        });
    }
    /**
     * 予約情報を確定してDBに保存するプロセス
     */
    // tslint:disable-next-line:max-func-body-length
    // tslint:disable-next-line:max-func-body-length
    processConfirm(reservationModel, cb) {
        // 仮押さえ有効期限チェック
        if (reservationModel.expiredAt && reservationModel.expiredAt < moment().valueOf()) {
            return cb(new Error(this.res.__('Message.Expired')), reservationModel);
        }
        // tslint:disable-next-line:max-func-body-length no-shadowed-variable
        const next = (reservationModel) => {
            // 購入日時確定
            reservationModel.purchasedAt = moment().valueOf();
            // 予約プロセス固有のログファイルをセット
            // tslint:disable-next-line:max-func-body-length
            this.setProcessLogger(reservationModel.paymentNo, () => {
                this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);
                const commonUpdate = {
                    // 決済移行のタイミングで仮予約有効期限を更新
                    expired_at: moment().add(conf.get('temporary_reservation_valid_period_seconds'), 'seconds').valueOf()
                };
                switch (this.purchaserGroup) {
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                        // GMO決済の場合、この時点で決済中ステータスに変更
                        commonUpdate.status = ttts_domain_1.ReservationUtil.STATUS_WAITING_SETTLEMENT;
                        commonUpdate.expired_at = null;
                        // 1.5次販売ユーザーの場合
                        if (this.req.preCustomerUser) {
                            commonUpdate.pre_customer = this.req.preCustomerUser.get('_id');
                            commonUpdate.pre_customer_user_id = this.req.preCustomerUser.get('user_id');
                        }
                        break;
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_MEMBER:
                        commonUpdate.member = this.req.memberUser.get('_id');
                        commonUpdate.member_user_id = this.req.memberUser.get('user_id');
                        break;
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_SPONSOR:
                        commonUpdate.sponsor = this.req.sponsorUser.get('_id');
                        commonUpdate.sponsor_user_id = this.req.sponsorUser.get('user_id');
                        commonUpdate.sponsor_name = this.req.sponsorUser.get('name');
                        break;
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_STAFF:
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
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_TEL:
                        commonUpdate.tel_staff = this.req.telStaffUser.get('_id');
                        commonUpdate.tel_staff_user_id = this.req.telStaffUser.get('user_id');
                        commonUpdate.purchaser_email = '';
                        commonUpdate.purchaser_age = '';
                        commonUpdate.purchaser_address = '';
                        commonUpdate.purchaser_gender = '';
                        break;
                    case ttts_domain_1.ReservationUtil.PURCHASER_GROUP_WINDOW:
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
                        cb(new Error(this.req.__('Message.UnexpectedError')), reservationModel);
                        break;
                }
                // いったん全情報をDBに保存
                const promises = reservationModel.seatCodes.map((seatCode, index) => {
                    let update = reservationModel.seatCode2reservationDocument(seatCode);
                    update = Object.assign(update, commonUpdate);
                    update.payment_seat_index = index;
                    return new Promise((resolve, reject) => {
                        this.logger.info('updating reservation all infos...update:', update);
                        ttts_domain_2.Models.Reservation.findOneAndUpdate({
                            _id: update._id
                        }, update, {
                            new: true
                        }, (err, reservation) => {
                            this.logger.info('reservation updated.', err, reservation);
                            if (err)
                                return reject(new Error(this.req.__('Message.UnexpectedError')));
                            if (!reservation)
                                return reject(new Error(this.req.__('Message.UnexpectedError')));
                            resolve();
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    cb(null, reservationModel);
                }, (err) => {
                    cb(err, reservationModel);
                });
            });
        };
        if (reservationModel.paymentNo) {
            next(reservationModel);
        }
        else {
            // 購入番号発行
            ttts_domain_1.ReservationUtil.publishPaymentNo((err, paymentNo) => {
                if (err || !paymentNo)
                    return cb(new Error(this.req.__('Message.UnexpectedError')), reservationModel);
                reservationModel.paymentNo = paymentNo;
                next(reservationModel);
            });
        }
    }
    /**
     * 購入番号から全ての予約を完了にする
     *
     * @param {string} paymentNo 購入番号
     * @param {Object} update 追加更新パラメータ
     */
    processFixReservations(paymentNo, update, cb) {
        update.status = ttts_domain_1.ReservationUtil.STATUS_RESERVED;
        update.updated_user = 'ReserveBaseController';
        // 予約完了ステータスへ変更
        this.logger.info('updating reservations by paymentNo...', paymentNo, update);
        ttts_domain_2.Models.Reservation.update({
            payment_no: paymentNo
        }, update, { multi: true }, (err, raw) => {
            this.logger.info('reservations updated.', err, raw);
            if (err)
                return cb(new Error('any reservations not updated.'));
            // 完了メールキュー追加(あれば更新日時を更新するだけ)
            this.logger.info('creating reservationEmailCue...');
            ttts_domain_2.Models.ReservationEmailCue.findOneAndUpdate({
                payment_no: paymentNo,
                template: ttts_domain_1.ReservationEmailCueUtil.TEMPLATE_COMPLETE
            }, {
                $set: { updated_at: Date.now() },
                $setOnInsert: { status: ttts_domain_1.ReservationEmailCueUtil.STATUS_UNSENT }
            }, {
                upsert: true,
                new: true
            }, (updateCueErr, cue) => {
                this.logger.info('reservationEmailCue created.', updateCueErr, cue);
                if (updateCueErr) {
                }
                cb(null);
            });
        });
    }
    /**
     * 予約プロセス用のロガーを設定する
     * 1決済管理番号につき、1ログファイル
     *
     * @param {string} paymentNo 購入番号
     */
    setProcessLogger(paymentNo, cb) {
        Util.getReservationLogger(paymentNo, (err, logger) => {
            if (err) {
            }
            else {
                this.logger = logger;
            }
            cb();
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
        return (this.req.session.purchaser) ? this.req.session.purchaser : undefined;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReserveBaseController;
