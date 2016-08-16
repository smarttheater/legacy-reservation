import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import reservePerformanceForm from '../../../forms/Reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/Reserve/reserveSeatForm';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import FilmUtil from '../../../../common/models/Film/FilmUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';

export default class WindowReserveController extends ReserveBaseController {
    public layout = 'layouts/window/layout';

    public static RESERVATION_LIMIT_PER_PERFORMANCE = 4; // パフォーマンスあたりの最大座席確保枚数

    public start(): void {
        // 予約トークンを発行
        let token = Util.createToken();
        let reservationModel = new ReservationModel();
        reservationModel.token = token;
        reservationModel.purchaserGroup = ReservationUtil.PURCHASER_GROUP_WINDOW
        reservationModel.purchaserLastName = '';
        reservationModel.purchaserFirstName = '';
        reservationModel.purchaserTel = '';
        reservationModel.purchaserEmail = '';

        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save((err) => {
            this.res.redirect(this.router.build('window.reserve.performances', {token: token}));
        });

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
                                    this.res.redirect(this.router.build('window.reserve.seats', {token: token}));
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
                        this.res.render('window/reserve/performances', {
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

            let limit = 4;

            if (this.req.method === 'POST') {
                reserveSeatForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {

                        let seatCodes: Array<string> = JSON.parse(this.req.form['seatCodes']);

                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            let message = this.req.__('Message.seatsLimit{{limit}}', {limit: limit.toString()});
                            this.res.redirect(`${this.router.build('window.reserve.seats', {token: token})}?message=${encodeURIComponent(message)}`);

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
                                            this.res.redirect(`${this.router.build('window.reserve.seats', {token: token})}?message=${encodeURIComponent(message)}`);
                                        });
                                    } else {
                                        reservationModel.save((err) => {
                                            // 券種選択へ
                                            this.res.redirect(this.router.build('window.reserve.tickets', {token: token}));
                                        });
                                    }
                                });
                            });

                        }

                    } else {
                        this.res.redirect(this.router.build('window.reserve.seats', {token: token}));

                    }

                });
            } else {

                this.res.render('window/reserve/seats', {
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

            reservationModel.paymentMethod = null;

            if (this.req.method === 'POST') {
                this.processFixTickets(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.redirect(this.router.build('window.reserve.tickets', {token: token}));
                    } else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('window.reserve.profile', {token: token}));
                        });
                    }
                });
            } else {
                this.res.render('window/reserve/tickets', {
                    reservationModel: reservationModel,
                });
            }
        });
    }

    /**
     * 購入者情報
     */
    public profile(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                this.processFixProfile(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.render('window/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    } else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('window.reserve.confirm', {token: token}));
                        });
                    }
                });
            } else {
                // セッションに情報があれば、フォーム初期値設定
                let email = reservationModel.purchaserEmail;
                this.res.locals.lastName = (reservationModel.purchaserLastName) ? reservationModel.purchaserLastName : '';
                this.res.locals.firstName = (reservationModel.purchaserFirstName) ? reservationModel.purchaserFirstName : '';
                this.res.locals.tel = (reservationModel.purchaserTel) ? reservationModel.purchaserTel : '';
                this.res.locals.email = (email) ? email : '';
                this.res.locals.emailConfirm = (email) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (email) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;

                this.res.render('window/reserve/profile', {
                    reservationModel: reservationModel
                });
            }
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
                        this.res.redirect(`${this.router.build('window.reserve.confirm', {token: token})}?message=${encodeURIComponent(message)}`);
                    } else {
                        // 予約確定
                        this.processFixReservations(reservationModel.paymentNo, {}, (err) => {
                            if (err) {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('window.reserve.confirm', {token: token})}?message=${encodeURIComponent(message)}`);
                            } else {
                                reservationModel.remove((err) => {
                                    this.logger.info('redirecting to complete...');
                                    this.res.redirect(this.router.build('window.reserve.complete', {paymentNo: reservationModel.paymentNo}));
                                });
                            }
                        });
                    }
                });
            } else {
                this.res.render('window/reserve/confirm', {
                    reservationModel: reservationModel
                });

            }
        });
    }

    /**
     * 予約完了
     */
    public complete(): void {
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                status: ReservationUtil.STATUS_RESERVED,
                window: this.req.windowUser.get('_id')
            },
            (err, reservationDocuments) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservationDocuments.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                this.res.render('window/reserve/complete', {
                    reservationDocuments: reservationDocuments
                });

            }
        );
    }
}
