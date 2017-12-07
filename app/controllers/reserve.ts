/**
 * 座席予約状態参照コントローラー
 *
 * @namespace controller/reserve
 */

import { Models } from '@motionpicture/ttts-domain';
import { NextFunction, Request, Response } from 'express';

import ReserveSessionModel from '../models/reserve/session';

/**
 * 座席の状態を取得する
 */
export async function getUnavailableSeatCodes(req: Request, res: Response, __: NextFunction) {
    try {
        const seatCodes = await Models.Reservation.distinct(
            'seat_code',
            {
                performance: req.params.performanceId
            }
        ).exec();

        res.json(seatCodes);
    } catch (error) {
        res.json([]);
    }
}

/**
 * 座席の状態を取得する
 */
export async function getSeatProperties(req: Request, res: Response, __: NextFunction) {
    try {
        const reservationModel = ReserveSessionModel.FIND(req);

        if (reservationModel === null) {
            res.json({ propertiesBySeatCode: {} });

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
            const baloonContent = seatCode;

            if (reservationModel.seatCodes.indexOf(seatCode) >= 0) {
                // 仮押さえ中
                avalilable = true;
            }

            propertiesBySeatCode[seatCode] = {
                avalilable: avalilable,
                baloonContent: baloonContent,
                entered: reservation.get('checked_in')
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

        res.json({
            propertiesBySeatCode: propertiesBySeatCode
        });
    } catch (error) {
        res.json({ propertiesBySeatCode: {} });
    }
}
