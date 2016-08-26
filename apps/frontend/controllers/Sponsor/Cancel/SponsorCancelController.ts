import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import sponsorCancelForm from '../../../forms/sponsor/sponsorCancelForm';

export default class SponsorCancelController extends BaseController {
    public layout = 'layouts/sponsor/layout';

    /**
     * チケットキャンセル
     */
    public index(): void {
        if (this.req.sponsorUser.isAuthenticated()) {
            // ログイン時そのまま
        } else {
            this.req.setLocale('ja');
        }

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
                        (err, reservations) => {
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
                        }
                    );

                } else {
                    this.res.json({
                        success: false,
                        message: '予約番号または電話番号下4ケタに誤りがあります'
                    });

                }

            });
        } else {
            this.res.locals.paymentNo = '';
            this.res.locals.last4DigitsOfTel = '';

            this.res.render('sponsor/cancel');

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
            (err, reservations) => {
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
                            status: ReservationUtil.STATUS_KEPT_BY_TIFF,
                            created_at: reservation.get('created_at'),
                            updated_at: Date.now()
                        };
                        Models.Reservation.findByIdAndUpdate(
                            reservation.get('_id'),
                            update,
                            option,
                            (err, reservation) => {
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
                        success: true,
                        message: null
                    });

                }, (err) => {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });

                });
            }
        );
    }

    public execute(): void {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            let updatedReservationIds = [];

            Models.Reservation.find(
                {
                    _id: {$in: reservationIds},
                    sponsor: this.req.sponsorUser.get('_id'),
                    purchaser_group: ReservationUtil.PURCHASER_GROUP_SPONSOR,
                    status: ReservationUtil.STATUS_RESERVED
                },
                (err, reservations) => {
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
                                status: ReservationUtil.STATUS_KEPT_BY_TIFF,
                                created_at: reservation.get('created_at'),
                                updated_at: Date.now()
                            };
                            Models.Reservation.findByIdAndUpdate(
                                reservation.get('_id').toString(),
                                update,
                                option,
                                (err, reservation) => {
                                    console.log('err:', err);
                                    if (err) {
                                        reject(err);
                                    } else {
                                        updatedReservationIds.push(reservation.get('_id').toString());
                                        resolve();
                                    }
                                }
                            );
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
                }
            );
        } else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError'),
                reservationId: []
            });
        }
    }
}
