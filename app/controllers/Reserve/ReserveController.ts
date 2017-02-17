import { Models } from '@motionpicture/ttts-domain';
import { ReservationUtil } from '@motionpicture/ttts-domain';
import { ScreenUtil } from '@motionpicture/ttts-domain';
import * as qr from 'qr-image';
import ReservationModel from '../../models/Reserve/ReservationModel';
import ReserveBaseController from '../ReserveBaseController';

export default class ReserveController extends ReserveBaseController {
    /**
     * 座席の状態を取得する
     */
    public getUnavailableSeatCodes() {
        const performanceId = this.req.params.performanceId;
        Models.Reservation.distinct(
            'seat_code',
            {
                performance: performanceId
            },
            (err, seatCodes) => {
                if (err) {
                    this.res.json([]);
                } else {
                    this.res.json(seatCodes);
                }
            }
        );
    }

    /**
     * 座席の状態を取得する
     */
    public getSeatProperties() {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || !reservationModel) {
                this.res.json({ propertiesBySeatCode: {} });
            } else {
                const propertiesBySeatCode: {
                    [seatCode: string]: {
                        avalilable: boolean, // 予約可能かどうか
                        baloonContent: string, // バルーン内容
                        entered: boolean // 入場済みかどうか
                    };
                } = {};

                // 予約リストを取得
                Models.Reservation.find(
                    {
                        performance: reservationModel.performance._id
                    },
                    (findReservationErr, reservations) => {
                        if (findReservationErr) {
                            this.res.json({ propertiesBySeatCode: {} });
                        } else {
                            // 予約データが存在すれば、現在仮押さえ中の座席を除いて予約不可(disabled)
                            for (const reservation of reservations) {
                                const seatCode = reservation.get('seat_code');
                                let avalilable = false;
                                let baloonContent = seatCode;

                                if (reservationModel.seatCodes.indexOf(seatCode) >= 0) {
                                    // 仮押さえ中
                                    avalilable = true;
                                }

                                // 内部関係者用
                                if (reservationModel.purchaserGroup === ReservationUtil.PURCHASER_GROUP_STAFF) {
                                    baloonContent = reservation.get('baloon_content4staff');

                                    // 内部関係者はTTTS確保も予約できる
                                    if (reservation.get('status') === ReservationUtil.STATUS_KEPT_BY_TTTS) {
                                        avalilable = true;
                                    }
                                }

                                propertiesBySeatCode[seatCode] = {
                                    avalilable: avalilable,
                                    baloonContent: baloonContent,
                                    entered: reservation.get('entered')
                                };
                            }

                            // 予約のない座席は全て空席
                            for (const seat of reservationModel.performance.screen.sections[0].seats) {
                                if (!propertiesBySeatCode.hasOwnProperty(seat.code)) {
                                    propertiesBySeatCode[seat.code] = {
                                        avalilable: true,
                                        baloonContent: seat.code,
                                        entered: false
                                    };
                                }
                            }

                            this.res.json({
                                propertiesBySeatCode: propertiesBySeatCode
                            });
                        }
                    }
                );
            }
        });
    }

    /**
     * create qrcode by reservation token and reservation id.
     */
    public qrcode() {
        Models.Reservation.findOne({ _id: this.req.params.reservationId }, 'payment_no payment_seat_index', (err, reservation) => {
            if (err) return this.next(err);

            // this.res.setHeader('Content-Type', 'image/png');
            qr.image(reservation.get('qr_str'), { type: 'png' }).pipe(this.res);
        });
    }

    /**
     * 印刷
     */
    public print(): void {
        const ids: string[] = JSON.parse(this.req.query.ids);
        Models.Reservation.find(
            {
                _id: { $in: ids },
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservations) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                reservations.sort((a, b) => {
                    return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });

                this.res.render('reserve/print', {
                    layout: false,
                    reservations: reservations
                });
            }
        );
    }
}
