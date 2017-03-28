import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import * as log4js from 'log4js';
import sponsorCancelForm from '../../../forms/sponsor/sponsorCancelForm';
import BaseController from '../../BaseController';

/**
 * 外部関係者座席予約キャンセルコントローラー
 *
 * @export
 * @class SponsorCancelController
 * @extends {BaseController}
 */
export default class SponsorCancelController extends BaseController {
    public layout: string = 'layouts/sponsor/layout';

    /**
     * チケットキャンセル
     */
    public index(): void {
        if (this.req.sponsorUser !== undefined && this.req.sponsorUser.isAuthenticated()) {
            // ログイン時そのまま
        } else {
            // this.req.setLocale('ja');
        }

        if (this.req.method === 'POST') {
            const form = sponsorCancelForm(this.req);
            form(this.req, this.res, async () => {
                if (this.req.form !== undefined && this.req.form.isValid) {
                    try {
                        // 予約を取得
                        const reservations = await Models.Reservation.find(
                            {
                                payment_no: (<any>this.req.form).paymentNo,
                                purchaser_tel: { $regex: `${(<any>this.req.form).last4DigitsOfTel}$` },
                                purchaser_group: ReservationUtil.PURCHASER_GROUP_SPONSOR,
                                status: ReservationUtil.STATUS_RESERVED
                            }
                        ).exec();

                        if (reservations.length === 0) {
                            this.res.json({
                                success: false,
                                message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
                            });
                            return;
                        }

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
                    } catch (error) {
                        this.res.json({
                            success: false,
                            message: this.req.__('Message.UnexpectedError')
                        });
                    }
                } else {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.invalidPaymentNoOrLast4DigitsOfTel')
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
     * 購入番号からキャンセルする
     */
    public async executeByPaymentNo(): Promise<void> {
        if (this.req.sponsorUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        const sponsorUser = this.req.sponsorUser;

        this.logger = log4js.getLogger('cancel');

        try {
            // 予約IDリストをjson形式で受け取る
            const reservationIds = JSON.parse(this.req.body.reservationIds);
            if (!Array.isArray(reservationIds)) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }

            const promises = reservationIds.map(async (id) => {
                this.logger.info('updating to STATUS_KEPT_BY_CHEVRE by sponsor... sponsor:', sponsorUser.get('user_id'), 'id:', id);
                const reservation = await Models.Reservation.findOneAndUpdate(
                    {
                        _id: id,
                        payment_no: this.req.body.paymentNo,
                        purchaser_tel: { $regex: `${this.req.body.last4DigitsOfTel}$` },
                        purchaser_group: ReservationUtil.PURCHASER_GROUP_SPONSOR,
                        status: ReservationUtil.STATUS_RESERVED
                    },
                    { status: ReservationUtil.STATUS_KEPT_BY_CHEVRE },
                    { new: true }
                ).exec();
                this.logger.info('updated to STATUS_KEPT_BY_CHEVRE.', reservation, 'sponsor:', sponsorUser.get('user_id'), 'id:', id);
            });

            await Promise.all(promises);

            this.res.json({
                success: true,
                message: null
            });
        } catch (error) {
            this.res.json({
                success: false,
                message: error.message
            });
        }
    }

    public async execute(): Promise<void> {
        if (this.req.sponsorUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        const sponsorUser = this.req.sponsorUser;

        this.logger = log4js.getLogger('cancel');

        try {
            // 予約IDリストをjson形式で受け取る
            const reservationIds = JSON.parse(this.req.body.reservationIds);
            if (!Array.isArray(reservationIds)) {
                throw new Error(this.req.__('Message.UnexpectedError'));
            }
            const promises = reservationIds.map(async (id) => {
                this.logger.info('updating to STATUS_KEPT_BY_CHEVRE by sponsor... sponsor:', sponsorUser.get('user_id'), 'id:', id);
                const reservation = await Models.Reservation.findOneAndUpdate(
                    { _id: id },
                    { status: ReservationUtil.STATUS_KEPT_BY_CHEVRE },
                    { new: true }
                ).exec();
                this.logger.info('updated to STATUS_KEPT_BY_CHEVRE.', reservation, 'sponsor:', sponsorUser.get('user_id'), 'id:', id);
            });

            await Promise.all(promises);

            this.res.json({
                success: true,
                message: null
            });
        } catch (error) {
            this.res.json({
                success: false,
                message: error.message
            });
        }
    }
}
