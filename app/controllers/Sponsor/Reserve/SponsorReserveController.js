"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const ttts_domain_3 = require("@motionpicture/ttts-domain");
const ttts_domain_4 = require("@motionpicture/ttts-domain");
const conf = require("config");
const lockFile = require("lockfile");
const moment = require("moment");
const reservePerformanceForm_1 = require("../../../forms/reserve/reservePerformanceForm");
const reserveSeatForm_1 = require("../../../forms/reserve/reserveSeatForm");
const ReservationModel_1 = require("../../../models/Reserve/ReservationModel");
const ReserveBaseController_1 = require("../../ReserveBaseController");
const DEFAULT_RADIX = 10;
/**
 * 外部関係者座席予約コントローラー
 *
 * @export
 * @class SponsorReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
class SponsorReserveController extends ReserveBaseController_1.default {
    constructor() {
        super(...arguments);
        this.purchaserGroup = ttts_domain_4.ReservationUtil.PURCHASER_GROUP_SPONSOR;
        this.layout = 'layouts/sponsor/layout';
    }
    start() {
        // 期限指定
        if (moment() < moment(conf.get('datetimes.reservation_start_sponsors'))) {
            return this.next(new Error(this.req.__('Message.OutOfTerm')));
        }
        this.processStart((err, reservationModel) => {
            if (err)
                this.next(new Error(this.req.__('Message.UnexpectedError')));
            if (reservationModel.performance) {
                reservationModel.save(() => {
                    const cb = this.router.build('sponsor.reserve.seats', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('sponsor.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            }
            else {
                reservationModel.save(() => {
                    const cb = this.router.build('sponsor.reserve.performances', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('sponsor.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
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
        if (!this.req.sponsorUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const sponsorUser = this.req.sponsorUser;
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            // 仮予約あればキャンセルする
            // tslint:disable-next-line:no-shadowed-variable
            this.processCancelSeats(reservationModel, (cancelSeatsErr, reservationModel) => {
                if (cancelSeatsErr)
                    return this.next(cancelSeatsErr);
                reservationModel.save(() => {
                    // 外部関係者による予約数を取得
                    ttts_domain_1.Models.Reservation.count({
                        sponsor: sponsorUser.get('_id'),
                        status: { $in: [ttts_domain_4.ReservationUtil.STATUS_TEMPORARY, ttts_domain_4.ReservationUtil.STATUS_RESERVED] }
                    }, (countReservationErr, reservationsCount) => {
                        if (countReservationErr)
                            return this.next(countReservationErr);
                        if (parseInt(sponsorUser.get('max_reservation_count'), DEFAULT_RADIX) <= reservationsCount) {
                            return this.next(new Error(this.req.__('Message.NoMoreReservation')));
                        }
                        if (this.req.method === 'POST') {
                            reservePerformanceForm_1.default(this.req, this.res, () => {
                                if (this.req.form && this.req.form.isValid) {
                                    // パフォーマンスFIX
                                    // tslint:disable-next-line:no-shadowed-variable
                                    const performanceId = this.req.form.performanceId;
                                    // tslint:disable-next-line:no-shadowed-variable
                                    this.processFixPerformance(reservationModel, performanceId, (fixPerformanceErr, reservationModel) => {
                                        if (fixPerformanceErr) {
                                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                                        }
                                        else {
                                            reservationModel.save(() => {
                                                this.res.redirect(this.router.build('sponsor.reserve.seats', { token: token }));
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
                            this.res.render('sponsor/reserve/performances', {
                                FilmUtil: ttts_domain_3.FilmUtil,
                                reservationsCount: reservationsCount
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
    // tslint:disable-next-line:max-func-body-length
    seats() {
        if (!this.req.sponsorUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const sponsorUser = this.req.sponsorUser;
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            // 外部関係者による予約数を取得
            // TODO ローカルファイルロック以外の方法を考える
            const lockPath = `${__dirname}/../../../../../lock/SponsorFixSeats${sponsorUser.get('_id')}.lock`;
            lockFile.lock(lockPath, { wait: 5000 }, (lockErr) => {
                if (lockErr)
                    return this.next(lockErr);
                ttts_domain_1.Models.Reservation.count({
                    sponsor: sponsorUser.get('_id'),
                    status: { $in: [ttts_domain_4.ReservationUtil.STATUS_TEMPORARY, ttts_domain_4.ReservationUtil.STATUS_RESERVED] },
                    seat_code: {
                        $nin: reservationModel.seatCodes // 現在のフロー中の予約は除く
                    }
                }, (countReservationErr, reservationsCount) => {
                    if (countReservationErr)
                        return this.next(countReservationErr);
                    // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
                    const reservableCount = parseInt(sponsorUser.get('max_reservation_count'), DEFAULT_RADIX) - reservationsCount;
                    const limit = Math.min(reservationModel.getSeatsLimit(), reservableCount);
                    // すでに枚数制限に達している場合
                    if (limit <= 0) {
                        lockFile.unlock(lockPath, () => {
                            this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() })));
                        });
                    }
                    else {
                        if (this.req.method === 'POST') {
                            reserveSeatForm_1.default(this.req, this.res, () => {
                                if (this.req.form && this.req.form.isValid) {
                                    const seatCodes = JSON.parse(this.req.form.seatCodes);
                                    // 追加指定席を合わせて制限枚数を超過した場合
                                    if (seatCodes.length > limit) {
                                        lockFile.unlock(lockPath, () => {
                                            const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                                            this.res.redirect(`${this.router.build('sponsor.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
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
                                                lockFile.unlock(lockPath, () => {
                                                    if (fixSeatsErr) {
                                                        reservationModel.save(() => {
                                                            const message = this.req.__('Message.SelectedSeatsUnavailable');
                                                            this.res.redirect(`${this.router.build('sponsor.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                                        });
                                                    }
                                                    else {
                                                        reservationModel.save(() => {
                                                            // 券種選択へ
                                                            this.res.redirect(this.router.build('sponsor.reserve.tickets', { token: token }));
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    }
                                }
                                else {
                                    lockFile.unlock(lockPath, () => {
                                        this.res.redirect(this.router.build('sponsor.reserve.seats', { token: token }));
                                    });
                                }
                            });
                        }
                        else {
                            lockFile.unlock(lockPath, () => {
                                this.res.render('sponsor/reserve/seats', {
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
        const token = this.req.params.token;
        ReservationModel_1.default.find(token, (err, reservationModel) => {
            if (err || !reservationModel)
                return this.next(new Error(this.req.__('Message.Expired')));
            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixTickets(reservationModel, (fixTicketsErr, reservationModel) => {
                    if (fixTicketsErr) {
                        this.res.redirect(this.router.build('sponsor.reserve.tickets', { token: token }));
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('sponsor.reserve.profile', { token: token }));
                        });
                    }
                });
            }
            else {
                this.res.render('sponsor/reserve/tickets', {
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
                        this.res.render('sponsor/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    }
                    else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('sponsor.reserve.confirm', { token: token }));
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
                this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : '';
                this.res.render('sponsor/reserve/profile', {
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
                        this.processFixReservations(reservationModel.paymentNo, {}, (fixReservationsErr) => {
                            if (fixReservationsErr) {
                                const message = fixReservationsErr.message;
                                this.res.redirect(`${this.router.build('sponsor.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            }
                            else {
                                reservationModel.remove(() => {
                                    this.logger.info('redirecting to complete...');
                                    this.res.redirect(this.router.build('sponsor.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                                });
                            }
                        });
                    }
                });
            }
            else {
                this.res.render('sponsor/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }
    complete() {
        if (!this.req.sponsorUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const paymentNo = this.req.params.paymentNo;
        ttts_domain_1.Models.Reservation.find({
            payment_no: paymentNo,
            status: ttts_domain_4.ReservationUtil.STATUS_RESERVED,
            sponsor: this.req.sponsorUser.get('_id'),
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
            this.res.render('sponsor/reserve/complete', {
                reservationDocuments: reservations
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorReserveController;
