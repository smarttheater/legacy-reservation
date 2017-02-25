"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const log4js = require("log4js");
const sponsorCancelForm_1 = require("../../../forms/sponsor/sponsorCancelForm");
const BaseController_1 = require("../../BaseController");
/**
 * 外部関係者座席予約キャンセルコントローラー
 *
 * @export
 * @class SponsorCancelController
 * @extends {BaseController}
 */
class SponsorCancelController extends BaseController_1.default {
    constructor() {
        super(...arguments);
        this.layout = 'layouts/sponsor/layout';
    }
    /**
     * チケットキャンセル
     */
    index() {
        if (this.req.sponsorUser && this.req.sponsorUser.isAuthenticated()) {
        }
        else {
        }
        if (this.req.method === 'POST') {
            const form = sponsorCancelForm_1.default(this.req);
            form(this.req, this.res, () => {
                if (this.req.form && this.req.form.isValid) {
                    // 予約を取得
                    chevre_domain_1.Models.Reservation.find({
                        payment_no: this.req.form.paymentNo,
                        purchaser_tel: { $regex: `${this.req.form.last4DigitsOfTel}$` },
                        purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_SPONSOR,
                        status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                    }, (findReservationErr, reservations) => {
                        if (findReservationErr) {
                            this.res.json({
                                success: false,
                                message: this.req.__('Message.UnexpectedError')
                            });
                        }
                        else {
                            if (reservations.length === 0) {
                                this.res.json({
                                    success: false,
                                    message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
                                });
                            }
                            else {
                                const results = reservations.map((reservation) => {
                                    return {
                                        _id: reservation.get('_id'),
                                        seat_code: reservation.get('seat_code'),
                                        payment_no: reservation.get('payment_no'),
                                        film_name_ja: reservation.get('film_name_ja'),
                                        film_name_en: reservation.get('film_name_en'),
                                        performance_start_str_ja: reservation.get('performance_start_str_ja'),
                                        performance_start_str_en: reservation.get('performance_start_str_en'),
                                        location_str_ja: reservation.get('location_str_ja'),
                                        location_str_en: reservation.get('location_str_en')
                                    };
                                });
                                this.res.json({
                                    success: true,
                                    message: null,
                                    reservations: results
                                });
                            }
                        }
                    });
                }
                else {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
                    });
                }
            });
        }
        else {
            this.res.locals.paymentNo = '';
            this.res.locals.last4DigitsOfTel = '';
            this.res.render('sponsor/cancel');
        }
    }
    /**
     * 購入番号からキャンセルする
     */
    executeByPaymentNo() {
        if (!this.req.sponsorUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const sponsorUser = this.req.sponsorUser;
        this.logger = log4js.getLogger('cancel');
        // 予約IDリストをjson形式で受け取る
        const reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            const promises = reservationIds.map((id) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('updating to STATUS_KEPT_BY_CHEVRE by sponsor... sponsor:', sponsorUser.get('user_id'), 'id:', id);
                    chevre_domain_1.Models.Reservation.findOneAndUpdate({
                        _id: id,
                        payment_no: this.req.body.paymentNo,
                        purchaser_tel: { $regex: `${this.req.body.last4DigitsOfTel}$` },
                        purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_SPONSOR,
                        status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
                    }, { status: chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_CHEVRE }, { new: true }, (err, reservation) => {
                        this.logger.info('updated to STATUS_KEPT_BY_CHEVRE.', err, reservation, 'sponsor:', sponsorUser.get('user_id'), 'id:', id);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.res.json({
                    success: true,
                    message: null
                });
            }, (err) => {
                this.res.json({
                    success: false,
                    message: err.message
                });
            });
        }
        else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError')
            });
        }
    }
    execute() {
        if (!this.req.sponsorUser)
            return this.next(new Error(this.req.__('Message.UnexpectedError')));
        const sponsorUser = this.req.sponsorUser;
        this.logger = log4js.getLogger('cancel');
        // 予約IDリストをjson形式で受け取る
        const reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            const promises = reservationIds.map((id) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('updating to STATUS_KEPT_BY_CHEVRE by sponsor... sponsor:', sponsorUser.get('user_id'), 'id:', id);
                    chevre_domain_1.Models.Reservation.findOneAndUpdate({ _id: id }, { status: chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_CHEVRE }, { new: true }, (err, reservation) => {
                        this.logger.info('updated to STATUS_KEPT_BY_CHEVRE.', err, reservation, 'sponsor:', sponsorUser.get('user_id'), 'id:', id);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.res.json({
                    success: true,
                    message: null
                });
            }, (err) => {
                this.res.json({
                    success: false,
                    message: err.message
                });
            });
        }
        else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError')
            });
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorCancelController;
