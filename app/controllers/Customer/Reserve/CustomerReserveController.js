"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const ttts_domain_3 = require("@motionpicture/ttts-domain");
const ttts_domain_4 = require("@motionpicture/ttts-domain");
const conf = require("config");
const moment = require("moment");
const GMOUtil_1 = require("../../../../common/Util/GMO/GMOUtil");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
class CustomerReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = ttts_domain_4.ReservationUtil.PURCHASER_GROUP_CUSTOMER;
    }
    /**
     * スケジュール選択(本番では存在しない、実際はポータル側のページ)
     */
    performances() {
        if (this.req.method === 'POST') {
            reservePerformanceForm_1.default(this.req, this.res, () => {
                if (this.req.form.isValid) {
                    const performaceId = this.req.form.performanceId;
                    this.res.redirect(this.router.build('customer.reserve.start') + `?performance=${performaceId}&locale=${this.req.getLocale()}`);
                }
                else {
                    this.res.render('customer/reserve/performances');
                }
            });
        }
        else {
            this.res.render('customer/reserve/performances', {
                FilmUtil: ttts_domain_3.FilmUtil
            });
        }
    }
    /**
     * ポータルからパフォーマンスと言語指定で遷移してくる
     */
    start() {
        // MPのIPは許可
        // tslint:disable-next-line:no-empty
        if (this.req.headers['x-forwarded-for'] && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
        }
        else {
            // 期限指定
            if (moment() < moment(conf.get('datetimes.reservation_start_customers_first'))) {
                if (this.req.query.locale) {
                    this.req.setLocale(this.req.query.locale);
                }
                return this.next(new Error(this.req.__('Message.OutOfTerm')));
            }
            // 2次販売10分前より閉める
            if (moment() < moment(conf.get('datetimes.reservation_start_customers_second'))
                && moment() > moment(conf.get('datetimes.reservation_start_customers_second')).add(-15, 'minutes')) {
                if (this.req.query.locale) {
                    this.req.setLocale(this.req.query.locale);
                }
                return this.next(new Error(this.req.__('Message.OutOfTerm')));
            }
        }
        this.processStart((err, reservationModel) => {
            if (err)
                return this.next(err);
            if (reservationModel.performance) {
                reservationModel.save(() => {
                    this.res.redirect(this.router.build('customer.reserve.terms', { token: reservationModel.token }));
                });
            }
            else {
                // 今回は必ずパフォーマンス指定で遷移してくるはず
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            }
        });
    }
    /**
     * 規約
     */
    terms() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                this.res.redirect(this.router.build('customer.reserve.seats', { token: token }));
            }
            else {
                this.res.render('customer/reserve/terms');
            }
        });
    }
    /**
     * 座席選択
     */
    seats() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            const limit = reservationModel.getSeatsLimit();
            if (this.req.method === 'POST') {
                reserveSeatForm_1.default(this.req, this.res, () => {
                    if (this.req.form.isValid) {
                        const seatCodes = JSON.parse(this.req.form.seatCodes);
                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                            this.res.redirect(`${this.router.build('customer.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                        }
                        else {
                            // 仮予約あればキャンセルする
                            // tslint:disable-next-line:no-shadowed-variable
                            this.processCancelSeats(reservationModel, (cancelSeatsErr, reservationModel) => {
                                if (cancelSeatsErr)
                                    return this.next(cancelSeatsErr);
                                // 座席FIX
                                // tslint:disable-next-line:no-shadowed-variable
                                this.processFixSeats(reservationModel, seatCodes, (fixSeatsErr, reservationModel) => {
                                    if (fixSeatsErr) {
                                        reservationModel.save(() => {
                                            const message = this.req.__('Message.SelectedSeatsUnavailable');
                                            this.res.redirect(`${this.router.build('customer.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
                                    }
                                    else {
                                        reservationModel.save(() => {
                                            // 券種選択へ
                                            this.res.redirect(this.router.build('customer.reserve.tickets', { token: token }));
                                        });
                                    }
                                });
                            });
                        }
                    }
                    else {
                        this.res.redirect(this.router.build('customer.reserve.seats', { token: token }));
                    }
                });
            }
            else {
                this.res.render('customer/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit
                });
            }
        });
    }
    /**
     * 券種選択
     */
    tickets() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            reservationModel.paymentMethod = null;
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixTickets(reservationModel, (fixTicketsErr, reservationModel) => {
                    if (fixTicketsErr) {
                        this.res.redirect(this.router.build('customer.reserve.tickets', { token: token }));
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('customer.reserve.profile', { token: token }));
                        });
                    }
                });
            }
            else {
                this.res.render('customer/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 購入者情報
     */
    profile() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixProfile(reservationModel, (fixProfileErr, reservationModel) => {
                    if (fixProfileErr) {
                        this.res.render('customer/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('customer.reserve.confirm', { token: token }));
                        });
                    }
                });
            }
            else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.purchaserEmail;
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
                this.res.render('customer/reserve/profile', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 予約内容確認
     */
    confirm() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processConfirm(reservationModel, (processConfirmErr, reservationModel) => {
                    if (processConfirmErr) {
                        reservationModel.remove(() => {
                            this.next(processConfirmErr);
                        });
                    }
                    else {
                        reservationModel.save(() => {
                            this.logger.info('starting GMO payment...');
                            const STATUS_CODE_PERMANENT_REDIRECT = 308;
                            this.res.redirect(STATUS_CODE_PERMANENT_REDIRECT, this.router.build('gmo.reserve.start', { token: token }) + `?locale=${this.req.getLocale()}`);
                        });
                    }
                });
            }
            else {
                this.res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 仮予約完了
     */
    waitingSettlement() {
        const paymentNo = this.req.params.paymentNo;
        ttts_domain_1.Models.Reservation.find({
            payment_no: paymentNo,
            purchaser_group: this.purchaserGroup,
            status: ttts_domain_4.ReservationUtil.STATUS_WAITING_SETTLEMENT,
            purchased_at: {
                // tslint:disable-next-line:no-magic-numbers
                $gt: moment().add(-30, 'minutes').toISOString()
            }
        }, (err, reservations) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            reservations.sort((a, b) => {
                return ttts_domain_2.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
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
        const paymentNo = this.req.params.paymentNo;
        ttts_domain_1.Models.Reservation.find({
            payment_no: paymentNo,
            purchaser_group: this.purchaserGroup,
            status: ttts_domain_4.ReservationUtil.STATUS_RESERVED,
            purchased_at: {
                // tslint:disable-next-line:no-magic-numbers
                $gt: moment().add(-30, 'minutes').toISOString()
            }
        }, (err, reservations) => {
            if (err)
                return this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservations.length === 0)
                return this.next(new Error(this.req.__('Message.NotFound')));
            reservations.sort((a, b) => {
                return ttts_domain_2.ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });
            this.res.render('customer/reserve/complete', {
                reservationDocuments: reservations
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CustomerReserveController;
