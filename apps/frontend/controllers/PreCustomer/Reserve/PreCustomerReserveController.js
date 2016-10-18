"use strict";
const ReserveBaseController_1 = require('../../ReserveBaseController');
const GMOUtil_1 = require('../../../../common/Util/GMO/GMOUtil');
const reservePerformanceForm_1 = require('../../../forms/reserve/reservePerformanceForm');
const reserveSeatForm_1 = require('../../../forms/reserve/reserveSeatForm');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const ScreenUtil_1 = require('../../../../common/models/Screen/ScreenUtil');
const FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
const ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
const lockFile = require('lockfile');
const moment = require('moment');
const conf = require('config');
class PreCustomerReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER;
        this.layout = 'layouts/preCustomer/layout';
    }
    start() {
        // 期限指定
        let now = moment();
        if (now < moment(conf.get('datetimes.reservation_start_pre_customers')) || moment(conf.get('datetimes.reservation_end_pre_customers')) < now) {
            return this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
        }
        this.processStart((err, reservationModel) => {
            if (err)
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationModel.performance) {
                // パフォーマンス指定で遷移してきたら座席選択へ
                reservationModel.save(() => {
                    this.res.redirect(this.router.build('pre.reserve.seats', { token: reservationModel.token }));
                });
            }
            else {
                // パフォーマンス指定なければパフォーマンス選択へ
                reservationModel.save(() => {
                    this.res.redirect(this.router.build('pre.reserve.performances', { token: reservationModel.token }));
                });
            }
        });
    }
    /**
     * 規約
     */
    terms() {
        this.next(new Error('Message.NotFound'));
    }
    /**
     * スケジュール選択
     */
    performances() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            // 仮予約あればキャンセルする
            this.processCancelSeats(reservationModel, (err, reservationModel) => {
                reservationModel.save(() => {
                    // 1.5次販売アカウントによる予約数を取得
                    // 決済中ステータスは含めない
                    Models_1.default.Reservation.count({
                        $and: [
                            { pre_customer: this.req.preCustomerUser.get('_id') },
                            {
                                $or: [
                                    { status: { $in: [ReservationUtil_1.default.STATUS_TEMPORARY, ReservationUtil_1.default.STATUS_RESERVED] } },
                                    {
                                        status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
                                        gmo_payment_term: { $exists: true }
                                    },
                                ]
                            }
                        ]
                    }, (err, reservationsCount) => {
                        let reservableCount = parseInt(this.req.preCustomerUser.get('max_reservation_count')) - reservationsCount;
                        if (reservableCount <= 0) {
                            return this.next(new Error(this.req.__('Message.NoMoreReservation')));
                        }
                        if (this.req.method === 'POST') {
                            reservePerformanceForm_1.default(this.req, this.res, (err) => {
                                if (this.req.form.isValid) {
                                    // パフォーマンスFIX
                                    this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                                        if (err) {
                                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                                        }
                                        else {
                                            reservationModel.save(() => {
                                                this.res.redirect(this.router.build('pre.reserve.seats', { token: token }));
                                            });
                                        }
                                    });
                                }
                                else {
                                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                                }
                            });
                        }
                        else {
                            this.res.render('preCustomer/reserve/performances', {
                                FilmUtil: FilmUtil_1.default,
                                reservableCount: reservableCount
                            });
                        }
                    });
                });
            });
        });
    }
    /**
     * 座席選択
     */
    seats() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            // 1.5次販売アカウントによる予約数を取得
            // 決済中ステータスは含めない
            let lockPath = `${__dirname}/../../../../../lock/PreCustomerFixSeats${this.req.preCustomerUser.get('_id')}.lock`;
            lockFile.lock(lockPath, { wait: 5000 }, (err) => {
                Models_1.default.Reservation.count({
                    $and: [
                        { pre_customer: this.req.preCustomerUser.get('_id') },
                        {
                            $or: [
                                { status: { $in: [ReservationUtil_1.default.STATUS_TEMPORARY, ReservationUtil_1.default.STATUS_RESERVED] } },
                                {
                                    status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
                                    gmo_payment_term: { $exists: true }
                                },
                            ]
                        },
                        {
                            $or: [
                                { performance: { $ne: reservationModel.performance._id } },
                                {
                                    performance: reservationModel.performance._id,
                                    seat_code: { $nin: reservationModel.seatCodes }
                                }
                            ]
                        }
                    ]
                }, (err, reservationsCount) => {
                    // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
                    let reservableCount = parseInt(this.req.preCustomerUser.get('max_reservation_count')) - reservationsCount;
                    let limit = Math.min(reservationModel.getSeatsLimit(), reservableCount);
                    // すでに枚数制限に達している場合
                    if (limit <= 0) {
                        lockFile.unlock(lockPath, (err) => {
                            this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() })));
                        });
                    }
                    else {
                        if (this.req.method === 'POST') {
                            reserveSeatForm_1.default(this.req, this.res, (err) => {
                                if (this.req.form.isValid) {
                                    let seatCodes = JSON.parse(this.req.form['seatCodes']);
                                    // 追加指定席を合わせて制限枚数を超過した場合
                                    if (seatCodes.length > limit) {
                                        lockFile.unlock(lockPath, (err) => {
                                            let message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                                            this.res.redirect(`${this.router.build('pre.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
                                    }
                                    else {
                                        // 仮予約あればキャンセルする
                                        this.processCancelSeats(reservationModel, (err, reservationModel) => {
                                            // 座席FIX
                                            this.processFixSeats(reservationModel, seatCodes, (err, reservationModel) => {
                                                lockFile.unlock(lockPath, () => {
                                                    if (err) {
                                                        reservationModel.save(() => {
                                                            let message = this.req.__('Message.SelectedSeatsUnavailable');
                                                            this.res.redirect(`${this.router.build('pre.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                                        });
                                                    }
                                                    else {
                                                        reservationModel.save(() => {
                                                            // 券種選択へ
                                                            this.res.redirect(this.router.build('pre.reserve.tickets', { token: token }));
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    }
                                }
                                else {
                                    lockFile.unlock(lockPath, (err) => {
                                        this.res.redirect(this.router.build('pre.reserve.seats', { token: token }));
                                    });
                                }
                            });
                        }
                        else {
                            lockFile.unlock(lockPath, (err) => {
                                this.res.render('preCustomer/reserve/seats', {
                                    reservationModel: reservationModel,
                                    limit: limit,
                                    reservableCount: reservableCount
                                });
                            });
                        }
                    }
                });
            });
        });
    }
    /**
     * 券種選択
     */
    tickets() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            reservationModel.paymentMethod = null;
            if (this.req.method === 'POST') {
                this.processFixTickets(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.redirect(this.router.build('pre.reserve.tickets', { token: token }));
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('pre.reserve.profile', { token: token }));
                        });
                    }
                });
            }
            else {
                this.res.render('preCustomer/reserve/tickets', {
                    reservationModel: reservationModel,
                });
            }
        });
    }
    /**
     * 購入者情報
     */
    profile() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                this.processFixProfile(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.render('preCustomer/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('pre.reserve.confirm', { token: token }));
                        });
                    }
                });
            }
            else {
                // セッションに情報があれば、フォーム初期値設定
                let email = reservationModel.purchaserEmail;
                this.res.locals.lastName = reservationModel.purchaserLastName;
                this.res.locals.firstName = reservationModel.purchaserFirstName;
                this.res.locals.tel = reservationModel.purchaserTel;
                this.res.locals.age = reservationModel.purchaserAge;
                this.res.locals.address = reservationModel.purchaserAddress;
                this.res.locals.gender = reservationModel.purchaserGender;
                this.res.locals.email = (email) ? email : '';
                this.res.locals.emailConfirm = (email) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (email) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : GMOUtil_1.default.PAY_TYPE_CREDIT;
                this.res.render('preCustomer/reserve/profile', {
                    reservationModel: reservationModel,
                });
            }
        });
    }
    /**
     * 予約内容確認
     */
    confirm() {
        let token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                this.processConfirm(reservationModel, (err, reservationModel) => {
                    if (err) {
                        reservationModel.remove(() => {
                            this.next(err);
                        });
                    }
                    else {
                        reservationModel.save(() => {
                            this.logger.info('starting GMO payment...');
                            this.res.redirect(307, this.router.build('gmo.reserve.start', { token: token }));
                        });
                    }
                });
            }
            else {
                this.res.render('preCustomer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 仮予約完了
     */
    waitingSettlement() {
        let paymentNo = this.req.params.paymentNo;
        Models_1.default.Reservation.find({
            payment_no: paymentNo,
            purchaser_group: this.purchaserGroup,
            status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
            purchased_at: {
                $gt: moment().add(-30, 'minutes').toISOString()
            }
        }, (err, reservations) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            reservations.sort((a, b) => {
                return ScreenUtil_1.default.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });
            this.res.render('customer/reserve/waitingSettlement', {
                reservationDocuments: reservations
            });
        });
    }
    /**
     * 予約完了
     */
    complete() {
        let paymentNo = this.req.params.paymentNo;
        Models_1.default.Reservation.find({
            payment_no: paymentNo,
            status: ReservationUtil_1.default.STATUS_RESERVED,
            purchased_at: {
                $gt: moment().add(-30, 'minutes').toISOString()
            }
        }, (err, reservations) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            reservations.sort((a, b) => {
                return ScreenUtil_1.default.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });
            this.res.render('preCustomer/reserve/complete', {
                reservationDocuments: reservations
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PreCustomerReserveController;
