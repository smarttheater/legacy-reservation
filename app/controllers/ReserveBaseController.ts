import { ReservationEmailCueUtil, ReservationUtil, ScreenUtil, TicketTypeGroupUtil } from '@motionpicture/chevre-domain';
import { Models } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as express from 'express';
import * as fs from 'fs-extra';
import * as moment from 'moment';
import * as _ from 'underscore';

import * as GMOUtil from '../../common/Util/GMO/GMOUtil';
import * as Util from '../../common/Util/Util';
import reserveProfileForm from '../forms/reserve/reserveProfileForm';
import reserveTicketForm from '../forms/reserve/reserveTicketForm';
import ReservationModel from '../models/Reserve/ReservationModel';
import BaseController from './BaseController';

const DEFAULT_RADIX = 10;

/**
 * 座席予約ベースコントローラー
 *
 * @export
 * @class ReserveBaseController
 * @extends {BaseController}
 */
export default class ReserveBaseController extends BaseController {
    /**
     * 購入者区分
     */
    public purchaserGroup: string;

    constructor(req: express.Request, res: express.Response, next: express.NextFunction) {
        super(req, res, next);

        this.res.locals.GMOUtil = GMOUtil;
        this.res.locals.ReservationUtil = ReservationUtil;
        this.res.locals.ScreenUtil = ScreenUtil;
        this.res.locals.Models = Models;
    }

    /**
     * 券種FIXプロセス
     */
    public async processFixTickets(reservationModel: ReservationModel): Promise<ReservationModel> {
        return new Promise<ReservationModel>((resolve, reject) => {
            reserveTicketForm(this.req, this.res, () => {
                if (this.req.form === undefined) {
                    reject(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                if (!this.req.form.isValid) {
                    reject(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }

                // 座席選択情報を保存して座席選択へ
                const choices = JSON.parse((<any>this.req.form).choices);
                if (!Array.isArray(choices)) {
                    reject(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }

                choices.forEach((choice: any) => {
                    const ticketType = reservationModel.ticketTypes.find((ticketTypeInArray) => {
                        return (ticketTypeInArray.code === choice.ticket_type_code);
                    });
                    if (ticketType === undefined) {
                        throw new Error(this.req.__('Message.UnexpectedError'));
                    }

                    const reservation = reservationModel.getReservation(choice.seat_code);
                    reservation.ticket_type_code = ticketType.code;
                    reservation.ticket_type_name_ja = ticketType.name.ja;
                    reservation.ticket_type_name_en = ticketType.name.en;
                    reservation.ticket_type_charge = ticketType.charge;
                    reservation.watcher_name = choice.watcher_name;

                    reservationModel.setReservation(reservation.seat_code, reservation);
                });

                resolve(reservationModel);
            });
        });
    }

    /**
     * 券種FIXプロセス
     */
    public async processFixProfile(reservationModel: ReservationModel): Promise<ReservationModel> {
        return new Promise<ReservationModel>((resolve, reject) => {
            const form = reserveProfileForm(this.req);
            form(this.req, this.res, (err) => {
                if (err instanceof Error) {
                    reject(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                if (this.req.form === undefined) {
                    reject(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                if (!this.req.form.isValid) {
                    reject(new Error(this.req.__('Message.Invalid')));
                    return;
                }

                // 購入者情報を保存して座席選択へ
                reservationModel.purchaserLastName = (<any>this.req.form).lastName;
                reservationModel.purchaserFirstName = (<any>this.req.form).firstName;
                reservationModel.purchaserEmail = (<any>this.req.form).email;
                reservationModel.purchaserTel = (<any>this.req.form).tel;
                reservationModel.purchaserAge = (<any>this.req.form).age;
                reservationModel.purchaserAddress = (<any>this.req.form).address;
                reservationModel.purchaserGender = (<any>this.req.form).gender;
                reservationModel.paymentMethod = (<any>this.req.form).paymentMethod;

                // 主体によっては、決済方法を強制的に固定で
                switch (this.purchaserGroup) {
                    case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                    case ReservationUtil.PURCHASER_GROUP_STAFF:
                        reservationModel.paymentMethod = '';
                        break;

                    case ReservationUtil.PURCHASER_GROUP_TEL:
                        reservationModel.paymentMethod = GMOUtil.PAY_TYPE_CVS;
                        break;

                    case ReservationUtil.PURCHASER_GROUP_MEMBER:
                        reservationModel.paymentMethod = GMOUtil.PAY_TYPE_CREDIT;
                        break;

                    default:
                        break;
                }

                // セッションに購入者情報格納
                this.savePurchaser(
                    (<any>this.req.form).lastName,
                    (<any>this.req.form).firstName,
                    (<any>this.req.form).tel,
                    (<any>this.req.form).email,
                    (<any>this.req.form).age,
                    (<any>this.req.form).address,
                    (<any>this.req.form).gender
                );

                resolve(reservationModel);
            });
        });
    }

    /**
     * 購入開始プロセス
     *
     * @param {string} purchaserGroup 購入者区分
     */
    protected async processStart(): Promise<ReservationModel> {
        // パフォーマンス未指定であればパフォーマンス選択へ
        // パフォーマンス指定であれば座席へ

        // 言語も指定
        if (!_.isEmpty(this.req.query.locale)) {
            (<any>this.req.session).locale = this.req.query.locale;
        } else {
            (<any>this.req.session).locale = 'ja';
        }

        // 予約トークンを発行
        const token = Util.createToken();
        let reservationModel = new ReservationModel();
        reservationModel.token = token;
        reservationModel.purchaserGroup = this.purchaserGroup;
        reservationModel = this.initializePayment(reservationModel);

        // この時点でトークンに対して購入番号を発行しておかないと、複数ウィンドウで購入番号がずれる可能性あり
        try {
            reservationModel.paymentNo = await ReservationUtil.publishPaymentNo();

            // パフォーマンスFIX
            if (this.purchaserGroup === ReservationUtil.PURCHASER_GROUP_SPONSOR &&
                this.req.sponsorUser !== undefined &&
                this.req.sponsorUser.get('performance') !== null) {
                // パフォーマンスFIX
                // tslint:disable-next-line:no-shadowed-variable
                reservationModel = await this.processFixPerformance(reservationModel, this.req.sponsorUser.get('performance'));
            } else if (!_.isEmpty(this.req.query.performance)) {
                // パフォーマンス指定遷移の場合
                // パフォーマンスFIX
                // tslint:disable-next-line:no-shadowed-variable
                reservationModel = await this.processFixPerformance(reservationModel, this.req.query.performance);
            }
        } catch (error) {
            console.error(error);
            throw new Error(this.req.__('Message.UnexpectedError'));
        }

        return reservationModel;
    }

    /**
     * 購入情報を初期化する
     */
    protected initializePayment(reservationModel: ReservationModel): ReservationModel {
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
            case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                if (purchaserFromSession !== undefined) {
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

            case ReservationUtil.PURCHASER_GROUP_MEMBER:
                if (purchaserFromSession !== undefined) {
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

            case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                if (purchaserFromSession !== undefined) {
                    reservationModel.purchaserLastName = purchaserFromSession.lastName;
                    reservationModel.purchaserFirstName = purchaserFromSession.firstName;
                    reservationModel.purchaserTel = purchaserFromSession.tel;
                    reservationModel.purchaserEmail = purchaserFromSession.email;
                    reservationModel.purchaserAge = purchaserFromSession.age;
                    reservationModel.purchaserAddress = purchaserFromSession.address;
                    reservationModel.purchaserGender = purchaserFromSession.gender;
                }
                break;

            case ReservationUtil.PURCHASER_GROUP_STAFF:
                if (this.req.staffUser === undefined) throw new Error(this.req.__('Message.UnexpectedError'));

                reservationModel.purchaserLastName = 'ナイブ';
                reservationModel.purchaserFirstName = 'カンケイシャ';
                reservationModel.purchaserTel = '0362263025';
                reservationModel.purchaserEmail = this.req.staffUser.get('email');
                reservationModel.purchaserAge = '00';
                reservationModel.purchaserAddress = '';
                reservationModel.purchaserGender = '1';
                break;

            case ReservationUtil.PURCHASER_GROUP_TEL:
                reservationModel.purchaserLastName = '';
                reservationModel.purchaserFirstName = '';
                reservationModel.purchaserTel = '';
                reservationModel.purchaserEmail = 'chevre@localhost.net';
                reservationModel.purchaserAge = '00';
                reservationModel.purchaserAddress = '';
                reservationModel.purchaserGender = '1';

                reservationModel.paymentMethodChoices = [GMOUtil.PAY_TYPE_CVS];
                break;

            case ReservationUtil.PURCHASER_GROUP_WINDOW:
                reservationModel.purchaserLastName = 'マドグチ';
                reservationModel.purchaserFirstName = 'タントウシャ';
                reservationModel.purchaserTel = '0362263025';
                reservationModel.purchaserEmail = 'chevre@localhost.net';
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
    // tslint:disable-next-line:prefer-function-over-method
    protected async processCancelSeats(reservationModel: ReservationModel): Promise<ReservationModel> {
        const ids = reservationModel.getReservationIds();
        if (ids.length === 0) {
            return reservationModel;
        }

        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];

        // 仮予約を空席ステータスに戻す
        try {
            await Models.Reservation.remove(
                { _id: { $in: ids } }
            ).exec();
        } catch (error) {
            // 失敗したとしても時間経過で消えるので放置
        }

        return reservationModel;
    }

    /**
     * パフォーマンスをFIXするプロセス
     * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
     */
    // tslint:disable-next-line:max-func-body-length
    protected async processFixPerformance(reservationModel: ReservationModel, perfomanceId: string): Promise<ReservationModel> {
        // パフォーマンス取得
        const performance = await Models.Performance.findOne(
            {
                _id: perfomanceId
            },
            'day open_time start_time end_time canceled film screen screen_name theater theater_name' // 必要な項目だけ指定すること
        )
            .populate('film', 'name ticket_type_group is_mx4d copyright') // 必要な項目だけ指定すること
            .populate('screen', 'name sections') // 必要な項目だけ指定すること
            .populate('theater', 'name address') // 必要な項目だけ指定すること
            // tslint:disable-next-line:max-func-body-length
            .exec();

        if (performance === null) {
            throw new Error(this.req.__('Message.NotFound'));
        }

        if (performance.get('canceled') === true) { // 万が一上映中止だった場合
            throw new Error(this.req.__('Message.OutOfTerm'));
        }

        // 内部と当日以外は、上映日当日まで購入可能
        if (this.purchaserGroup !== ReservationUtil.PURCHASER_GROUP_WINDOW &&
            this.purchaserGroup !== ReservationUtil.PURCHASER_GROUP_STAFF) {
            if (parseInt(performance.get('day'), DEFAULT_RADIX) < parseInt(moment().format('YYYYMMDD'), DEFAULT_RADIX)) {
                throw new Error('You cannot reserve this performance.');
            }
        }

        // 券種取得
        const ticketTypeGroup = await Models.TicketTypeGroup.findOne(
            { _id: performance.get('film').get('ticket_type_group') }
        ).exec();

        reservationModel.seatCodes = [];

        // 券種リストは、予約する主体によって異なる
        // 内部関係者の場合
        switch (this.purchaserGroup) {
            case ReservationUtil.PURCHASER_GROUP_STAFF:
                reservationModel.ticketTypes = TicketTypeGroupUtil.getOne4staff();
                break;

            case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                reservationModel.ticketTypes = TicketTypeGroupUtil.getOne4sponsor();
                break;

            case ReservationUtil.PURCHASER_GROUP_MEMBER:
                // メルマガ当選者の場合、一般だけ
                reservationModel.ticketTypes = [];

                for (const ticketType of ticketTypeGroup.get('types')) {
                    if (ticketType.get('code') === TicketTypeGroupUtil.TICKET_TYPE_CODE_ADULTS) {
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
                        case TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS_ON_THE_DAY:
                            if (moment().format('YYYYMMDD') === performance.get('day')) {
                                reservationModel.ticketTypes.push(ticketType);
                            }

                            break;

                        case TicketTypeGroupUtil.TICKET_TYPE_CODE_STUDENTS:
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
            if (reservationModel.paymentMethodChoices.indexOf(GMOUtil.PAY_TYPE_CVS) >= 0) {
                reservationModel.paymentMethodChoices.splice(reservationModel.paymentMethodChoices.indexOf(GMOUtil.PAY_TYPE_CVS), 1);
            }
        }

        // スクリーン座席表HTMLを保管
        reservationModel.screenHtml = fs.readFileSync(
            `${__dirname}/../../common/views/screens/${performance.get('screen').get('_id').toString()}.ejs`,
            'utf8'
        );
        return reservationModel;
    }

    /**
     * 座席をFIXするプロセス
     * 新規仮予約 ここが今回の肝です！！！
     *
     * @param {ReservationModel} reservationModel
     * @param {Array<string>} seatCodes
     */
    protected async processFixSeats(reservationModel: ReservationModel, seatCodes: string[]): Promise<ReservationModel> {
        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        reservationModel.expiredAt = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();

        // 新たな座席指定と、既に仮予約済みの座席コードについて
        const promises = seatCodes.map(async (seatCode) => {
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
                status: ReservationUtil.STATUS_TEMPORARY,
                expired_at: reservationModel.expiredAt,
                staff: undefined,
                sponsor: undefined,
                member: undefined,
                tel: undefined,
                window: undefined,
                pre_customer: undefined
            };
            switch (this.purchaserGroup) {
                case ReservationUtil.PURCHASER_GROUP_STAFF:
                    newReservation.staff = (<Express.StaffUser>this.req.staffUser).get('_id');
                    break;
                case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                    newReservation.sponsor = (<Express.SponsorUser>this.req.sponsorUser).get('_id');
                    break;
                case ReservationUtil.PURCHASER_GROUP_MEMBER:
                    newReservation.member = (<Express.MemberUser>this.req.memberUser).get('_id');
                    break;
                case ReservationUtil.PURCHASER_GROUP_TEL:
                    newReservation.tel = (<Express.TelStaffUser>this.req.telStaffUser).get('_id');
                    break;
                case ReservationUtil.PURCHASER_GROUP_WINDOW:
                    newReservation.window = (<Express.WindowUser>this.req.windowUser).get('_id');
                    break;
                case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                    if (this.req.preCustomerUser !== undefined) {
                        newReservation.pre_customer = (<Express.PreCustomerUser>this.req.preCustomerUser).get('_id');
                    }
                    break;

                default:
                    break;
            }

            // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
            const reservation = await Models.Reservation.create(newReservation);

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
        });

        await Promise.all(promises);
        // 座席コードのソート(文字列順に)
        reservationModel.seatCodes.sort(ScreenUtil.sortBySeatCode);
        return reservationModel;
    }

    /**
     * 予約情報を確定してDBに保存するプロセス
     */
    // tslint:disable-next-line:max-func-body-length
    // tslint:disable-next-line:max-func-body-length
    protected async processConfirm(reservationModel: ReservationModel): Promise<ReservationModel> {
        // 仮押さえ有効期限チェック
        if (reservationModel.expiredAt !== undefined && reservationModel.expiredAt < moment().valueOf()) {
            throw new Error(this.res.__('Message.Expired'));
        }

        // tslint:disable-next-line:max-func-body-length no-shadowed-variable
        const next = async (reservationModel: ReservationModel): Promise<ReservationModel> => {
            // 購入日時確定
            reservationModel.purchasedAt = moment().valueOf();

            // 予約プロセス固有のログファイルをセット
            // tslint:disable-next-line:max-func-body-length
            this.setProcessLogger(reservationModel.paymentNo);
            this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);

            const commonUpdate: any = {
                // 決済移行のタイミングで仮予約有効期限を更新
                expired_at: moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').valueOf()
            };
            switch (this.purchaserGroup) {
                case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                    // GMO決済の場合、この時点で決済中ステータスに変更
                    commonUpdate.status = ReservationUtil.STATUS_WAITING_SETTLEMENT;
                    commonUpdate.expired_at = null;

                    // 1.5次販売ユーザーの場合
                    if (this.req.preCustomerUser !== undefined) {
                        commonUpdate.pre_customer = this.req.preCustomerUser.get('_id');
                        commonUpdate.pre_customer_user_id = this.req.preCustomerUser.get('user_id');
                    }

                    break;

                case ReservationUtil.PURCHASER_GROUP_MEMBER:
                    commonUpdate.member = (<Express.MemberUser>this.req.memberUser).get('_id');
                    commonUpdate.member_user_id = (<Express.MemberUser>this.req.memberUser).get('user_id');
                    break;

                case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                    commonUpdate.sponsor = (<Express.SponsorUser>this.req.sponsorUser).get('_id');
                    commonUpdate.sponsor_user_id = (<Express.SponsorUser>this.req.sponsorUser).get('user_id');
                    commonUpdate.sponsor_name = (<Express.SponsorUser>this.req.sponsorUser).get('name');
                    break;

                case ReservationUtil.PURCHASER_GROUP_STAFF:
                    commonUpdate.staff = (<Express.StaffUser>this.req.staffUser).get('_id');
                    commonUpdate.staff_user_id = (<Express.StaffUser>this.req.staffUser).get('user_id');
                    commonUpdate.staff_name = (<Express.StaffUser>this.req.staffUser).get('name');
                    commonUpdate.staff_email = (<Express.StaffUser>this.req.staffUser).get('email');
                    commonUpdate.staff_signature = (<Express.StaffUser>this.req.staffUser).get('signature');

                    commonUpdate.purchaser_last_name = '';
                    commonUpdate.purchaser_first_name = '';
                    commonUpdate.purchaser_email = '';
                    commonUpdate.purchaser_tel = '';
                    commonUpdate.purchaser_age = '';
                    commonUpdate.purchaser_address = '';
                    commonUpdate.purchaser_gender = '';
                    break;

                case ReservationUtil.PURCHASER_GROUP_TEL:
                    commonUpdate.tel_staff = (<Express.TelStaffUser>this.req.telStaffUser).get('_id');
                    commonUpdate.tel_staff_user_id = (<Express.TelStaffUser>this.req.telStaffUser).get('user_id');

                    commonUpdate.purchaser_email = '';
                    commonUpdate.purchaser_age = '';
                    commonUpdate.purchaser_address = '';
                    commonUpdate.purchaser_gender = '';
                    break;

                case ReservationUtil.PURCHASER_GROUP_WINDOW:
                    commonUpdate.window = (<Express.WindowUser>this.req.windowUser).get('_id');
                    commonUpdate.window_user_id = (<Express.WindowUser>this.req.windowUser).get('user_id');

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
            const promises = reservationModel.seatCodes.map(async (seatCode, index) => {
                let update = reservationModel.seatCode2reservationDocument(seatCode);
                update = Object.assign(update, commonUpdate);
                (<any>update).payment_seat_index = index;

                this.logger.info('updating reservation all infos...update:', update);
                const reservation = await Models.Reservation.findOneAndUpdate(
                    {
                        _id: update._id
                    },
                    update,
                    {
                        new: true
                    }
                ).exec();
                this.logger.info('reservation updated.', reservation);

                if (reservation === null) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }
            });

            await Promise.all(promises);
            return reservationModel;
        };

        if (reservationModel.paymentNo !== undefined) {
            return next(reservationModel);
        } else {
            // 購入番号発行
            try {
                reservationModel.paymentNo = await ReservationUtil.publishPaymentNo();
                return next(reservationModel);
            } catch (error) {
                console.error(error);
                throw new Error(this.req.__('Message.UnexpectedError'));
            }
        }
    }

    /**
     * 購入番号から全ての予約を完了にする
     *
     * @param {string} paymentNo 購入番号
     * @param {Object} update 追加更新パラメータ
     */
    protected async processFixReservations(paymentNo: string, update: any) {
        (<any>update).status = ReservationUtil.STATUS_RESERVED;
        (<any>update).updated_user = 'ReserveBaseController';

        // 予約完了ステータスへ変更
        this.logger.info('updating reservations by paymentNo...', paymentNo, update);
        const raw = await Models.Reservation.update(
            { payment_no: paymentNo },
            update,
            { multi: true }
        ).exec();
        this.logger.info('reservations updated.', raw);

        try {
            // 完了メールキュー追加(あれば更新日時を更新するだけ)
            this.logger.info('creating reservationEmailCue...');
            const cue = await Models.ReservationEmailCue.findOneAndUpdate(
                {
                    payment_no: paymentNo,
                    template: ReservationEmailCueUtil.TEMPLATE_COMPLETE
                },
                {
                    $set: { updated_at: Date.now() },
                    $setOnInsert: { status: ReservationEmailCueUtil.STATUS_UNSENT }
                },
                {
                    upsert: true,
                    new: true
                }
            ).exec();
            this.logger.info('reservationEmailCue created.', cue);
        } catch (error) {
            console.error(error);
            // 失敗してもスルー(ログと運用でなんとかする)
        }
    }

    /**
     * 予約プロセス用のロガーを設定する
     * 1決済管理番号につき、1ログファイル
     *
     * @param {string} paymentNo 購入番号
     */
    protected setProcessLogger(paymentNo: string) {
        const logger = Util.getReservationLogger(paymentNo);
        this.logger = logger;
    }

    /**
     * 購入者情報をセッションに保管する
     */
    protected savePurchaser(lastName: string, firstName: string, tel: string, email: string, age: string, address: string, gender: string) {
        (<any>this.req.session).purchaser = {
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
    protected findPurchaser(): IPurchaser | undefined {
        return (<any>this.req.session).purchaser;
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
