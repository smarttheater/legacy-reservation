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
        Models.Reservation.distinct(
            '_id',
            {
                payment_no: this.req.body.paymentNo,
                purchaser_tel: {$regex: `${this.req.body.last4DigitsOfTel}$`},
                purchaser_group: ReservationUtil.PURCHASER_GROUP_SPONSOR,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, ids) => {
                if (err) {
                    return this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                }

                if (ids.length === 0) {
                    return this.res.json({
                        success: false,
                        message: '予約番号または電話番号下4ケタに誤りがあります'
                    });
                }

                Models.Reservation['updateStatus2keptbytiff'](ids, (err, raw) => {
                    if (err) {
                        this.res.json({
                            success: false,
                            message: err.message
                        });
                    } else {
                        this.res.json({
                            success: true,
                            message: null
                        });
                    }
                });
            }
        );
    }

    public execute(): void {
        // 予約IDリストをjson形式で受け取る
        let reservationIds = JSON.parse(this.req.body.reservationIds);
        if (Array.isArray(reservationIds)) {
            Models.Reservation['updateStatus2keptbytiff'](reservationIds, (err, raw) => {
                if (err) {
                    this.res.json({
                        success: false,
                        message: err.message
                    });
                } else {
                    this.res.json({
                        success: true,
                        message: null
                    });
                }
            });
        } else {
            this.res.json({
                success: false,
                message: this.req.__('Message.UnexpectedError')
            });
        }
    }
}
