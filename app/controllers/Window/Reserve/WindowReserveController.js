"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const ttts_domain_3 = require("@motionpicture/ttts-domain");
const ttts_domain_4 = require("@motionpicture/ttts-domain");
const moment = require("moment");
const GMOUtil = require("../../../../common/Util/GMO/GMOUtil");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
/**
 * 当日窓口座席予約コントローラー
 *
 * @export
 * @class WindowReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
class WindowReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = ttts_domain_4.ReservationUtil.PURCHASER_GROUP_WINDOW;
        this.layout = 'layouts/window/layout';
    }
    start() {
        this.processStart((err, reservationModel) => {
            if (err)
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationModel.performance) {
                reservationModel.save(() => {
                    const cb = this.router.build('window.reserve.seats', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('window.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            }
            else {
                reservationModel.save(() => {
                    const cb = this.router.build('window.reserve.performances', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('window.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            }
        });
    }
    /**
     * 規約(スキップ)
     */
    terms() {
        const cb = (this.req.query.cb) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }
    /**
     * スケジュール選択
     */
    performances() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                reservePerformanceForm_1.default(this.req, this.res, () => {
                    if (this.req.form && this.req.form.isValid) {
                        // パフォーマンスFIX
                        const performanceId = this.req.form.performanceId;
                        // tslint:disable-next-line:no-shadowed-variable
                        this.processFixPerformance(reservationModel, performanceId, (fixPerformanceErr, reservationModel) => {
                            if (fixPerformanceErr) {
                                this.next(fixPerformanceErr);
                            }
                            else {
                                reservationModel.save(() => {
                                    this.res.redirect(this.router.build('window.reserve.seats', { token: token }));
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
                // 仮予約あればキャンセルする
                // tslint:disable-next-line:no-shadowed-variable
                this.processCancelSeats(reservationModel, (cancelSeatsErr, reservationModel) => {
                    if (cancelSeatsErr)
                        return this.next(cancelSeatsErr);
                    reservationModel.save(() => {
                        this.res.render('window/reserve/performances', {
                            FilmUtil: ttts_domain_3.FilmUtil
                        });
                    });
                });
            }
        });
    }
    /**
     * 座席選択
     */
    seats() {
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            const limit = reservationModel.getSeatsLimit();
            if (this.req.method === 'POST') {
                reserveSeatForm_1.default(this.req, this.res, () => {
                    if (this.req.form && this.req.form.isValid) {
                        const seatCodes = JSON.parse(this.req.form.seatCodes);
                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                            this.res.redirect(`${this.router.build('window.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
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
                                            this.res.redirect(`${this.router.build('window.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
                                    }
                                    else {
                                        reservationModel.save(() => {
                                            // 券種選択へ
                                            this.res.redirect(this.router.build('window.reserve.tickets', { token: token }));
                                        });
                                    }
                                });
                            });
                        }
                    }
                    else {
                        this.res.redirect(this.router.build('window.reserve.seats', { token: token }));
                    }
                });
            }
            else {
                this.res.render('window/reserve/seats', {
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
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            reservationModel.paymentMethod = '';
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixTickets(reservationModel, (fixTicketsErr, reservationModel) => {
                    if (fixTicketsErr) {
                        this.res.redirect(this.router.build('window.reserve.tickets', { token: token }));
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('window.reserve.profile', { token: token }));
                        });
                    }
                });
            }
            else {
                this.res.render('window/reserve/tickets', {
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
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixProfile(reservationModel, (fixProfileErr, reservationModel) => {
                    if (fixProfileErr) {
                        this.res.render('window/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('window.reserve.confirm', { token: token }));
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
                this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;
                this.res.render('window/reserve/profile', {
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
            if (err || !reservationModel)
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
                        // 予約確定
                        this.processFixReservations(reservationModel.paymentNo, {}, (fixReservationErr) => {
                            if (fixReservationErr) {
                                const message = fixReservationErr.message;
                                this.res.redirect(`${this.router.build('window.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            }
                            else {
                                reservationModel.remove(() => {
                                    this.logger.info('redirecting to complete...');
                                    this.res.redirect(this.router.build('window.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                                });
                            }
                        });
                    }
                });
            }
            else {
                this.res.render('window/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    /**
     * 予約完了
     */
    complete() {
        if (!this.req.windowUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const paymentNo = this.req.params.paymentNo;
        ttts_domain_1.Models.Reservation.find({
            payment_no: paymentNo,
            status: ttts_domain_4.ReservationUtil.STATUS_RESERVED,
            window: this.req.windowUser.get('_id'),
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
            this.res.render('window/reserve/complete', {
                reservationDocuments: reservations
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WindowReserveController;
