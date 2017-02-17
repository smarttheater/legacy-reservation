import { Models } from '@motionpicture/ttts-domain';
import { ReservationUtil } from '@motionpicture/ttts-domain';
import { FilmUtil } from '@motionpicture/ttts-domain';
import * as mongoose from 'mongoose';
import BaseController from '../BaseController';

/**
 * 入場コントローラー
 *
 * 上映当日入場画面から使う機能はここにあります。
 *
 * @class AdmissionController
 */
export default class AdmissionController extends BaseController {
    public layout = 'layouts/admission/layout';

    /**
     * 入場画面のパフォーマンス検索
     *
     * @memberOf AdmissionController
     */
    public performances(): void {
        if (this.req.method === 'POST') {
            if (this.req.body.performanceId) {
                this.res.redirect(this.router.build('admission.confirm', { id: this.req.body.performanceId }));
            } else {
                this.res.redirect(this.router.build('admission.performances'));
            }
        } else {
            // 劇場とスクリーンを取得
            Models.Theater.find(
                {},
                'name',
                (err, theaters) => {
                    if (err) return this.next(err);

                    Models.Screen.find(
                        {},
                        'name theater',
                        (findScreenErr, screens) => {
                            if (findScreenErr) return this.next(findScreenErr);

                            const screensByTheater: any = {};
                            for (const screen of screens) {
                                if (!screensByTheater.hasOwnProperty(screen.get('theater'))) {
                                    screensByTheater[screen.get('theater')] = [];
                                }

                                screensByTheater[screen.get('theater')].push(screen);
                            }

                            this.res.render('admission/performances', {
                                FilmUtil: FilmUtil,
                                theaters: theaters,
                                screensByTheater: screensByTheater
                            });
                        }
                    );
                }
            );
        }
    }

    /**
     * QRコード認証画面
     *
     * QRコードを読み取って結果を表示するための画面
     *
     * @memberOf AdmissionController
     */
    public confirm(): void {
        Models.Performance.findOne({ _id: this.req.params.id })
            .populate('film', 'name')
            .populate('screen', 'name')
            .populate('theater', 'name')
            .exec((err, performance) => {
                if (err) this.next(new Error('Message.UnexpectedError'));

                Models.Reservation.find(
                    {
                        performance: performance.get('_id'),
                        status: ReservationUtil.STATUS_RESERVED
                    },
                    'seat_code ticket_type_code ticket_type_name_ja ticket_type_name_en entered payment_no payment_seat_index'
                ).exec((findReservationErr, reservations) => {
                    if (findReservationErr) this.next(new Error('Message.UnexpectedError'));

                    const reservationsById: {
                        [id: string]: mongoose.Document
                    } = {};
                    const reservationIdsByQrStr: {
                        [qr: string]: string
                    } = {};
                    for (const reservation of reservations) {
                        reservationsById[reservation.get('_id').toString()] = reservation;
                        reservationIdsByQrStr[reservation.get('qr_str')] = reservation.get('_id').toString();
                    }

                    this.res.render('admission/confirm', {
                        performance: performance,
                        reservationsById: reservationsById,
                        reservationIdsByQrStr: reservationIdsByQrStr
                    });
                });
            });
    }
}
