"use strict";
const BaseController_1 = require('../../BaseController');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const sponsorCancelForm_1 = require('../../../forms/sponsor/sponsorCancelForm');
class SponsorCancelController extends BaseController_1.default {
    constructor(...args) {
        super(...args);
        this.layout = 'layouts/sponsor/layout';
    }
    /**
     * チケットキャンセル
     */
    index() {
        if (this.req.sponsorUser.isAuthenticated()) {
        }
        else {
            this.req.setLocale('ja');
        }
        if (this.req.method === 'POST') {
            let form = sponsorCancelForm_1.default(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // 予約を取得
                    Models_1.default.Reservation.find({
                        payment_no: this.req.form['paymentNo'],
                        purchaser_tel: { $regex: `${this.req.form['last4DigitsOfTel']}$` },
                        purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR,
                        status: ReservationUtil_1.default.STATUS_RESERVED
                    }, (err, reservations) => {
                        if (err) {
                            return this.res.json({
                                success: false,
                                message: this.req.__('Message.UnexpectedError')
                            });
                        }
                        if (reservations.length === 0) {
                            return this.res.json({
                                success: false,
                                message: '予約番号または電話番号下4ケタに誤りがあります'
                            });
                        }
                        this.res.json({
                            success: true,
                            message: null,
                            reservations: reservations
                        });
                    });
                }
                else {
                    this.res.json({
                        success: false,
                        message: '予約番号または電話番号下4ケタに誤りがあります'
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
     * 予約番号からキャンセルする
     */
    executeByPaymentNo() {
        // TIFF確保にステータス更新
        Models_1.default.Reservation.find({
            payment_no: this.req.body.paymentNo,
            purchaser_tel: { $regex: `${this.req.body.last4DigitsOfTel}$` },
            purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }, '_id performance seat_code created_at', (err, reservations) => {
            if (err) {
                return this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError')
                });
            }
            if (reservations.length === 0) {
                return this.res.json({
                    success: false,
                    message: '予約番号または電話番号下4ケタに誤りがあります'
                });
            }
            let promises = [];
            let option = {
                new: true,
                overwrite: true
            };
            for (let reservation of reservations) {
                promises.push(new Promise((resolve, reject) => {
                    let update = {
                        performance: reservation.get('performance'),
                        seat_code: reservation.get('seat_code'),
                        status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF,
                        created_at: reservation.get('created_at'),
                        updated_at: Date.now()
                    };
                    Models_1.default.Reservation.findByIdAndUpdate(reservation.get('_id'), update, option, (err, reservation) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve();
                        }
                    });
                }));
            }
            Promise.all(promises).then(() => {
                this.res.json({
                    success: true,
                    message: null
                });
            }, (err) => {
                this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError')
                });
            });
        });
    }
    execute() {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            let updatedReservationIds = [];
            Models_1.default.Reservation.find({
                _id: { $in: reservationIds },
                sponsor: this.req.sponsorUser.get('_id'),
                purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR,
                status: ReservationUtil_1.default.STATUS_RESERVED
            }, (err, reservations) => {
                let promises = [];
                let option = {
                    new: true,
                    overwrite: true
                };
                for (let reservation of reservations) {
                    promises.push(new Promise((resolve, reject) => {
                        // TIFF確保にステータス更新
                        let update = {
                            performance: reservation.get('performance'),
                            seat_code: reservation.get('seat_code'),
                            status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF,
                            created_at: reservation.get('created_at'),
                            updated_at: Date.now()
                        };
                        Models_1.default.Reservation.findByIdAndUpdate(reservation.get('_id').toString(), update, option, (err, reservation) => {
                            console.log('err:', err);
                            if (err) {
                                reject(err);
                            }
                            else {
                                updatedReservationIds.push(reservation.get('_id').toString());
                                resolve();
                            }
                        });
                    }));
                }
                Promise.all(promises).then(() => {
                    this.res.json({
                        success: true,
                        reservationIds: updatedReservationIds
                    });
                }, (err) => {
                    this.res.json({
                        success: false,
                        message: err.message,
                        reservationId: []
                    });
                });
            });
        }
        else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError'),
                reservationId: []
            });
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorCancelController;
