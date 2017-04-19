import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';
import ReservationModel from '../../models/Reserve/ReservationModel';
import ReserveBaseController from '../ReserveBaseController';

/**
 * 座席予約状態参照コントローラー
 *
 * @export
 * @class ReserveController
 * @extends {ReserveBaseController}
 */
export default class ReserveController extends ReserveBaseController {
    /**
     * 座席の状態を取得する
     */
    public async getUnavailableSeatCodes() {
        try {
            const seatCodes = await Models.Reservation.distinct(
                'seat_code',
                {
                    performance: this.req.params.performanceId
                }
            ).exec();

            this.res.json(seatCodes);
        } catch (error) {
            this.res.json([]);
        }
    }

    /**
     * 座席の状態を取得する
     */
    public async getSeatProperties() {
        try {
            const token = this.req.params.token;
            const reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.res.json({ propertiesBySeatCode: {} });
                return;
            }

            const propertiesBySeatCode: {
                [seatCode: string]: {
                    avalilable: boolean, // 予約可能かどうか
                    baloonContent: string, // バルーン内容
                    entered: boolean // 入場済みかどうか
                };
            } = {};

            // 予約リストを取得
            const reservations = await Models.Reservation.find(
                {
                    performance: reservationModel.performance._id
                }
            ).exec();

            // 予約データが存在すれば、現在仮押さえ中の座席を除いて予約不可(disabled)
            reservations.forEach((reservation) => {
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

                    // 内部関係者はCHEVRE確保も予約できる
                    if (reservation.get('status') === ReservationUtil.STATUS_KEPT_BY_CHEVRE) {
                        avalilable = true;
                    }
                }

                propertiesBySeatCode[seatCode] = {
                    avalilable: avalilable,
                    baloonContent: baloonContent,
                    entered: reservation.get('entered')
                };
            });

            // 予約のない座席は全て空席
            reservationModel.performance.screen.sections[0].seats.forEach((seat) => {
                if (!propertiesBySeatCode.hasOwnProperty(seat.code)) {
                    propertiesBySeatCode[seat.code] = {
                        avalilable: true,
                        baloonContent: seat.code,
                        entered: false
                    };
                }
            });

            this.res.json({
                propertiesBySeatCode: propertiesBySeatCode
            });
        } catch (error) {
            this.res.json({ propertiesBySeatCode: {} });
        }
    }

    /**
     * 印刷
     */
    public async print() {
        try {
            const ids: string[] = JSON.parse(this.req.query.ids);
            const reservations = await Models.Reservation.find(
                {
                    _id: { $in: ids },
                    status: ReservationUtil.STATUS_RESERVED
                }
            ).exec();

            if (reservations.length === 0) {
                this.next(new Error(this.req.__('Message.NotFound')));
                return;
            }

            reservations.sort((a, b) => {
                return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });

            this.res.render('reserve/print', {
                layout: false,
                reservations: reservations
            });
        } catch (error) {
            console.error(error);
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
