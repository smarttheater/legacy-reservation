import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import SponsorReserveCancelForm from '../../../forms/Sponsor/Reserve/SponsorReserveCancelForm';
import mongoose = require('mongoose');
import ReservationCancelModel from '../../../models/Reserve/ReservationCancelModel';

export default class SponsorCancelController extends BaseController {
    public index(): void {
        let sponsorReserveCancelForm = new SponsorReserveCancelForm();
        if (this.req.method === 'POST') {

            sponsorReserveCancelForm.form.handle(this.req, {
                success: (form) => {
                    sponsorReserveCancelForm.form = form;

                    // 予約検索
                    this.useMongoose(() => {
                        this.logger.debug('finding reservation... payment_no:', form.data.payment_no, form.data.tel);
                        Models.Reservation.findOne(
                        {
                            payment_no: form.data.payment_no,
                            purchaser_tel: {$regex: `${form.data.tel}$`},
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        (err, reservationDocument) => {
                            mongoose.disconnect(() => {

                                if (err || reservationDocument === null) {
                                    return this.res.render('sponsor/cancel/index', {
                                        form: form
                                    });
                                } else {
                                    // トークンを発行してキャンセルページへ
                                    let reservationCancelModel = new ReservationCancelModel();
                                    reservationCancelModel.token = Util.createToken();
                                    reservationCancelModel.paymentNo = reservationDocument.get('payment_no');

                                    reservationCancelModel.save((err) => {
                                        this.res.redirect(this.router.build('sponsor.cancel.reservations', {token: reservationCancelModel.token}));
                                    });
                                }
                            });
                        });
                    });
                },
                error: (form) => {
                    this.res.render('sponsor/cancel/index', {
                        form: form
                    });
                },
                empty: (form) => {
                    this.res.render('sponsor/cancel/index', {
                        form: form
                    });
                }
            });


        } else {
            this.res.render('sponsor/cancel/index', {
                form: sponsorReserveCancelForm.form
            });
        }
    }

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
                    status: ReservationUtil.STATUS_RESERVED
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
                // TIFF確保にステータス更新
                this.logger.debug('canceling reservation...id:', reservationId);
                Models.Reservation.findOneAndUpdate(
                {
                    _id: reservationId,
                    payment_no: reservationCancelModel.paymentNo,
                },
                {
                    status: ReservationUtil.STATUS_KEPT_BY_TIFF
                },
                {
                    new: true
                },
                (err, reservationDocument) => {
                    mongoose.disconnect(() => {
                        if (err || reservationDocument === null) {
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
