"use strict";
const BaseController_1 = require('../../BaseController');
const Models_1 = require('../../../../common/models/Models');
const ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
const sponsorCancelForm_1 = require('../../../forms/sponsor/sponsorCancelForm');
class SponsorCancelController extends BaseController_1.default {
    /**
     * チケットキャンセル
     */
    index() {
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
                    }, (err, reservationDocuments) => {
                        if (err) {
                            return this.res.json({
                                isSuccess: false,
                                message: this.req.__('Message.UnexpectedError')
                            });
                        }
                        if (reservationDocuments.length === 0) {
                            return this.res.json({
                                isSuccess: false,
                                message: '予約番号または電話番号下4ケタに誤りがあります'
                            });
                        }
                        this.res.json({
                            isSuccess: true,
                            message: null,
                            reservations: reservationDocuments
                        });
                    });
                }
                else {
                    this.res.json({
                        isSuccess: false,
                        message: '予約番号または電話番号下4ケタに誤りがあります'
                    });
                }
            });
        }
        else {
            this.res.locals.paymentNo = '';
            this.res.locals.last4DigitsOfTel = '';
            this.res.render('sponsor/cancel', {
                layout: 'layouts/sponsor/layout'
            });
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
        }, '_id performance seat_code created_at', (err, reservationDocuments) => {
            if (err) {
                return this.res.json({
                    isSuccess: false,
                    messaeg: this.req.__('Message.UnexpectedError')
                });
            }
            if (reservationDocuments.length === 0) {
                return this.res.json({
                    isSuccess: false,
                    message: '予約番号または電話番号下4ケタに誤りがあります'
                });
            }
            let promises = [];
            for (let reservationDocument of reservationDocuments) {
                promises.push(new Promise((resolve, reject) => {
                    let update = {
                        // _id: reservationDocuments[0].get('_id'),
                        performance: reservationDocument.get('performance'),
                        seat_code: reservationDocument.get('seat_code'),
                        status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF,
                        created_at: reservationDocument.get('created_at'),
                        updated_at: Date.now()
                    };
                    this.logger.debug('updating reservations...update:', update);
                    Models_1.default.Reservation.findByIdAndUpdate(reservationDocument.get('_id'), update, {
                        new: true,
                        // multi: true,
                        overwrite: true
                    }, (err, reservationDocument) => {
                        this.logger.debug('reservations updated.', err);
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
                    isSuccess: true,
                    messaeg: null
                });
            }, (err) => {
                this.res.json({
                    isSuccess: false,
                    messaeg: this.req.__('Message.UnexpectedError')
                });
            });
        });
    }
    execute() {
        let reservationId = this.req.body.reservation_id;
        // TIFF確保にステータス更新
        this.logger.debug('canceling reservation...id:', reservationId);
        Models_1.default.Reservation.update({
            _id: reservationId,
            sponsor: this.sponsorUser.get('_id'),
        }, {
            status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF
        }, (err, raw) => {
            if (err) {
                this.res.json({
                    isSuccess: false,
                    messaeg: this.req.__('Message.UnexpectedError'),
                    reservationId: reservationId
                });
            }
            else {
                this.res.json({
                    isSuccess: true,
                    reservationId: reservationId
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorCancelController;
