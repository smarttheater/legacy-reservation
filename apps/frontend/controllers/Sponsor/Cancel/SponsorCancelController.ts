import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import Util from '../../../../common/Util/Util';

import Models from '../../../../common/models/Models';

import mongoose = require('mongoose');

import ReservationCancelModel from '../../../models/Reserve/ReservationCancelModel';

export default class SponsorCancelController extends BaseController {
    public reservations(): void {
        let token = this.req.params.token;
        ReservationCancelModel.find(token, (err, reservationCancelModel) => {
            if (err || reservationCancelModel === null) {
                return this.next(new Error('キャンセルプロセスが中断されました'));
            }


            // 予約リストを取得
            this.useMongoose(() => {
                Models.Reservation.find(
                {
                    payment_no: reservationCancelModel.paymentNo,
                },
                {},
                {sort : {seat_code: 1}}
                )
                .populate('performance film theater screen') // スペースつなぎで、複数populateできる
                .exec((err, reservationDocuments) => {
                    mongoose.disconnect(() => {

                        if (err || reservationDocuments.length < 1) {
                            this.next(new Error('予約を取得できませんでした'));
                        } else {

                            // スクリーンの全座席コード
                            let screenSeatCodes = [];
                            for (let seatDocument of reservationDocuments[0].get('screen').get('sections')[0].get('seats')) {
                                screenSeatCodes.push(seatDocument.get('code'));
                            }

                            this.res.render('sponsor/cancel/reservations', {
                                reservationDocuments: reservationDocuments,
                                screenSeatCodes: screenSeatCodes,
                                reservationCancelModel: reservationCancelModel
                            });
                        }
                    });
                });
            });


        });
    }

    public execute(): void {
        let token = this.req.body.token;
        ReservationCancelModel.find(token, (err, reservationCancelModel) => {
            if (err || reservationCancelModel === null) {
                return this.next(new Error('キャンセルプロセスが中断されました'));
            }


            let reservationId = this.req.body.reservation_id;

            this.useMongoose(() => {
                this.logger.debug('canceling reservation...id:', reservationId);
                Models.Reservation.remove(
                {
                    _id: reservationId,
                    payment_no: reservationCancelModel.paymentNo,
                },
                (err) => {
                    mongoose.disconnect(() => {
                        if (err) {
                            this.res.json({
                                isSuccess: false,
                                reservationId: reservationId
                            });
                        } else {
                            this.res.json({
                                isSuccess: true,
                                reservationId: reservationId
                            });
                        }
                    });
                });
            });
        });

    }
}
