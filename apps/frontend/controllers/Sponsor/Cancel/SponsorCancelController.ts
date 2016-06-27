import BaseController from '../../BaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import Util from '../../../../common/Util/Util';
import SponsorReserveLoginForm from '../../../forms/Sponsor/Reserve/SponsorReserveLoginForm';
import SponsorReservePerformanceForm from '../../../forms/Sponsor/Reserve/SponsorReservePerformanceForm';
import SponsorReserveSeatForm from '../../../forms/Sponsor/Reserve/SponsorReserveSeatForm';
import SponsorReserveTicketForm from '../../../forms/Sponsor/Reserve/SponsorReserveTicketForm';
import SponsorReserveProfileForm from '../../../forms/Sponsor/Reserve/SponsorReserveProfileForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import mongoose = require('mongoose');

import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

export default class SponsorCancelController extends BaseController {
    public reservations(): void {
        // 予約リストを取得
        this.useMongoose(() => {
            Models.Reservation.find(
            {
                payment_no: this.req.params.paymentNo,
                sponsor: this.sponsorUser.get('_id')
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
                        });
                    }
                });
            });
        });
    }

    public execute(): void {
        let reservationId = this.req.body.reservation_id;

        this.useMongoose(() => {
            this.logger.debug('canceling reservation...id:', reservationId);
            Models.Reservation.remove(
            {
                _id: reservationId,
                sponsor: this.sponsorUser.get('_id'),
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
    }
}
