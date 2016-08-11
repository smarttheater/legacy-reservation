import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import sponsorCancelForm from '../../../forms/sponsor/sponsorCancelForm';

export default class SponsorCancelController extends BaseController {
    /**
     * チケットキャンセル
     */
    public index(): void {
        if (this.req.method === 'POST') {
            let form = sponsorCancelForm(this.req);
            form(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // 予約を取得
                    Models.Reservation.find(
                        {
                            payment_no: this.req.form['paymentNo'],
                            purchaser_tel: {$regex: `${this.req.form['last4DigitsOfTel']}$`},
                            purchaser_group: ReservationUtil.PURCHASER_GROUP_SPONSOR,
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        (err, reservationDocuments) => {
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
                        }
                    );

                } else {
                    this.res.json({
                        isSuccess: false,
                        message: '予約番号または電話番号下4ケタに誤りがあります'
                    });

                }

            });
        } else {
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
    public executeByPaymentNo(): void {
        // TIFF確保にステータス更新
        Models.Reservation.find(
            {
                payment_no: this.req.body.paymentNo,
                purchaser_tel: {$regex: `${this.req.body.last4DigitsOfTel}$`},
                purchaser_group: ReservationUtil.PURCHASER_GROUP_SPONSOR,
                status: ReservationUtil.STATUS_RESERVED
            },
            '_id performance seat_code created_at',
            (err, reservationDocuments) => {
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
                            status: ReservationUtil.STATUS_KEPT_BY_TIFF,
                            created_at: reservationDocument.get('created_at'),
                            updated_at: Date.now()
                        };
                        this.logger.debug('updating reservations...update:', update);
                        Models.Reservation.findByIdAndUpdate(
                            reservationDocument.get('_id'),
                            update,
                            {
                                new: true,
                                // multi: true,
                                overwrite: true
                            },
                            (err, reservationDocument) => {
                                this.logger.debug('reservations updated.', err);
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            }
                        );
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
            }
        );
    }

    public execute(): void {
        let reservationId = this.req.body.reservation_id;

        // TIFF確保にステータス更新
        this.logger.debug('canceling reservation...id:', reservationId);
        Models.Reservation.update(
            {
                _id: reservationId,
                sponsor: this.sponsorUser.get('_id'),
            },
            {
                status: ReservationUtil.STATUS_KEPT_BY_TIFF
            },
            (err, raw) => {
                if (err) {
                    this.res.json({
                        isSuccess: false,
                        messaeg: this.req.__('Message.UnexpectedError'),
                        reservationId: reservationId
                    });
                } else {
                    this.res.json({
                        isSuccess: true,
                        reservationId: reservationId
                    });
                }
            }
        );
    }
}
