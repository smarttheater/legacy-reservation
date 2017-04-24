import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import { FilmUtil } from '@motionpicture/chevre-domain';
import * as mongoose from 'mongoose';
import * as _ from 'underscore';

import BaseController from '../BaseController';

/**
 * 入場コントローラー
 *
 * 上映当日入場画面から使う機能はここにあります。
 *
 * @class AdmissionController
 */
export default class AdmissionController extends BaseController {
    public layout: string = 'layouts/admission/layout';

    /**
     * 入場画面のパフォーマンス検索
     *
     * @memberOf AdmissionController
     */
    public async performances() {
        if (this.req.method === 'POST') {
            if (!_.isEmpty(this.req.body.performanceId)) {
                this.res.redirect(`/admission/performance/${this.req.body.performanceId}/confirm`);
            } else {
                this.res.redirect('/admission/performances');
            }
        } else {
            try {
                // 劇場とスクリーンを取得
                const theaters = await Models.Theater.find(
                    {},
                    'name'
                ).exec();

                const screens = await Models.Screen.find(
                    {},
                    'name theater'
                ).exec();

                const screensByTheater: any = {};
                screens.forEach((screen) => {
                    if (screensByTheater[screen.get('theater')] === undefined) {
                        screensByTheater[screen.get('theater')] = [];
                    }

                    screensByTheater[screen.get('theater')].push(screen);
                });

                this.res.render('admission/performances', {
                    FilmUtil: FilmUtil,
                    theaters: theaters,
                    screensByTheater: screensByTheater
                });
            } catch (error) {
                this.next(error);
            }
        }
    }

    /**
     * QRコード認証画面
     *
     * QRコードを読み取って結果を表示するための画面
     *
     * @memberOf AdmissionController
     */
    public async confirm() {
        try {
            const performance = await Models.Performance.findOne({ _id: this.req.params.id })
                .populate('film', 'name')
                .populate('screen', 'name')
                .populate('theater', 'name')
                .exec();

            const reservations = await Models.Reservation.find(
                {
                    performance: performance.get('_id'),
                    status: ReservationUtil.STATUS_RESERVED
                },
                'performance_day seat_code ticket_type_code ticket_type_name_ja ticket_type_name_en entered payment_no payment_seat_index'
            ).exec();

            const reservationsById: {
                [id: string]: mongoose.Document
            } = {};
            const reservationIdsByQrStr: {
                [qr: string]: string
            } = {};
            reservations.forEach((reservation) => {
                reservationsById[reservation.get('_id').toString()] = reservation;
                reservationIdsByQrStr[reservation.get('qr_str')] = reservation.get('_id').toString();
            });

            this.res.render('admission/confirm', {
                performance: performance,
                reservationsById: reservationsById,
                reservationIdsByQrStr: reservationIdsByQrStr
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
