import ReserveBaseController from '../../ReserveBaseController';
import StaffUser from '../../../models/User/StaffUser';
import Util from '../../../../common/Util/Util';
import reservePerformanceForm from '../../../forms/Reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/Reserve/reserveSeatForm';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ScreenUtil from '../../../../common/models/Screen/ScreenUtil';
import FilmUtil from '../../../../common/models/Film/FilmUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReserveControllerInterface from '../../ReserveControllerInterface';
import moment = require('moment');
import conf = require('config');

export default class StaffReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup = ReservationUtil.PURCHASER_GROUP_STAFF;
    public layout = 'layouts/staff/layout';
    public static RESERVATION_LIMIT_PER_PERFORMANCE = 10; // パフォーマンスあたりの最大座席確保枚数

    public start(): void {
        // 期限指定
        if (moment() < moment(conf.get<string>('datetimes.reservation_start_staffs'))) {
            return this.next(new Error('Message.OutOfTerm'));
        }

        this.processStart((err, reservationModel) => {
            if (err) this.next(new Error(this.req.__('Message.UnexpectedError')));

            if (reservationModel.performance) {
                reservationModel.save((err) => {
                    let cb = this.router.build('staff.reserve.seats', {token: reservationModel.token});
                    this.res.redirect(`${this.router.build('staff.reserve.terms', {token: reservationModel.token})}?cb=${encodeURIComponent(cb)}`);
                });
            } else {
                reservationModel.save((err) => {
                    let cb = this.router.build('staff.reserve.performances', {token: reservationModel.token});
                    this.res.redirect(`${this.router.build('staff.reserve.terms', {token: reservationModel.token})}?cb=${encodeURIComponent(cb)}`);
                });
            }
        });
    }

    /**
     * 規約(スキップ)
     */
    public terms(): void {
        let cb = (this.req.query.cb) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }

    /**
     * スケジュール選択
     */
    public performances(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                reservePerformanceForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // パフォーマンスFIX
                        this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                            if (err) {
                                this.next(err);
                            } else {

                                this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save((err) => {
                                    this.res.redirect(this.router.build('staff.reserve.seats', {token: token}));
                                });

                            }
                        });

                    } else {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));

                    }

                });
            } else {
                // 仮予約あればキャンセルする
                this.processCancelSeats(reservationModel, (err, reservationModel) => {
                    this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save((err) => {
                        this.res.render('staff/reserve/performances', {
                            FilmUtil: FilmUtil
                        });
                    });
                });

            }

        });
    }

    /**
     * 座席選択
     */
    public seats(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            let limit = StaffReserveController.RESERVATION_LIMIT_PER_PERFORMANCE;

            if (this.req.method === 'POST') {
                reserveSeatForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {

                        let seatCodes: Array<string> = JSON.parse(this.req.form['seatCodes']);

                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            let message = this.req.__('Message.seatsLimit{{limit}}', {limit: limit.toString()});
                            this.res.redirect(`${this.router.build('staff.reserve.seats', {token: token})}?message=${encodeURIComponent(message)}`);

                        } else {
                            // 仮予約あればキャンセルする
                            this.logger.debug('processCancelSeats processing...');
                            this.processCancelSeats(reservationModel, (err, reservationModel) => {
                                this.logger.debug('processCancelSeats processed.', err);

                                // 座席FIX
                                this.processFixSeats(reservationModel, seatCodes, (err, reservationModel) => {
                                    if (err) {
                                        reservationModel.save((err) => {
                                            let message = this.req.__('Mesasge.SelectedSeatsUnavailable');
                                            this.res.redirect(`${this.router.build('staff.reserve.seats', {token: token})}?message=${encodeURIComponent(message)}`);
                                        });
                                    } else {
                                        reservationModel.save((err) => {
                                            // 券種選択へ
                                            this.res.redirect(this.router.build('staff.reserve.tickets', {token: token}));
                                        });
                                    }
                                });
                            });

                        }

                    } else {
                        this.res.redirect(this.router.build('staff.reserve.seats', {token: token}));

                    }

                });
            } else {

                this.res.render('staff/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit
                });

            }

        });
    }

    /**
     * 券種選択
     */
    public tickets(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                this.processFixTickets(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.redirect(this.router.build('staff.reserve.tickets', {token: token}));
                    } else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('staff.reserve.profile', {token: token}));
                        });
                    }
                });
            } else {
                this.res.render('staff/reserve/tickets', {
                    reservationModel: reservationModel,
                });
            }
        });
    }

    /**
     * 購入者情報(スキップ)
     */
    public profile(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            this.res.redirect(this.router.build('staff.reserve.confirm', {token: token}));
        });
    }

    /**
     * 予約内容確認
     */
    public confirm(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                this.processConfirm(reservationModel, (err, reservationModel) => {
                    if (err) {
                        let message = err.message;
                        this.res.redirect(`${this.router.build('staff.reserve.confirm', {token: token})}?message=${encodeURIComponent(message)}`);
                    } else {
                        // 予約確定
                        this.processFixReservations(reservationModel.paymentNo, {}, (err) => {
                            if (err) {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('staff.reserve.confirm', {token: token})}?message=${encodeURIComponent(message)}`);
                            } else {
                                reservationModel.remove((err) => {
                                    this.logger.info('redirecting to complete...');
                                    this.res.redirect(this.router.build('staff.reserve.complete', {paymentNo: reservationModel.paymentNo}));
                                });
                            }
                        });
                    }
                });
            } else {
                this.res.render('staff/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }

    public complete(): void {
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                status: ReservationUtil.STATUS_RESERVED,
                staff: this.req.staffUser.get('_id')
            },
            (err, reservations) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                reservations.sort((a, b) => {
                    return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });

                this.res.render('staff/reserve/complete', {
                    reservationDocuments: reservations
                });
            }
        );
    }
}
