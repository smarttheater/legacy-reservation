import ReserveBaseController from '../../ReserveBaseController';
import MvtkUser from '../../../models/User/MvtkUser';
import Util from '../../../../common/Util/Util';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import reservePerformanceForm from '../../../forms/Reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/Reserve/reserveSeatForm';
import reserveTicketForm from '../../../forms/Reserve/reserveTicketForm';
import reserveProfileForm from '../../../forms/Reserve/reserveProfileForm';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import FilmUtil from '../../../../common/models/Film/FilmUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import lockFile = require('lockfile');

export default class WindowReserveController extends ReserveBaseController {
    public static RESERVATION_LIMIT_PER_PERFORMANCE = 4; // パフォーマンスあたりの最大座席確保枚数

    public start(): void {
        // 予約トークンを発行
        let token = Util.createToken();
        let reservationModel = new ReservationModel();
        reservationModel.token = token;
        reservationModel.purchaserGroup = ReservationUtil.PURCHASER_GROUP_WINDOW

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
                            layout: 'layouts/window/layout',
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
                    layout: 'layouts/window/layout',
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
                reserveTicketForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(this.req.form['choices']);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                let reservation = reservationModel.getReservation(choice.seat_code);

                                let ticketType = reservationModel.ticketTypes.find((ticketType) => {
                                    return (ticketType.code === choice.ticket_type_code);
                                });
                                if (!ticketType) {
                                    return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                }

                                reservation.ticket_type_code = ticketType.code;
                                reservation.ticket_type_name = ticketType.name;
                                reservation.ticket_type_name_en = ticketType.name_en;
                                reservation.ticket_type_charge = ticketType.charge;;

                                reservationModel.setReservation(reservation._id, reservation);
                            });

                            this.logger.debug('saving reservationModel... ');
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('window.reserve.profile', {token: token}));
                            });

                        } else {
                            this.next(new Error(this.req.__('Message.UnexpectedError')));
                        }

                    } else {
                        this.res.redirect(this.router.build('window.reserve.tickets', {token: token}));

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
                let form = reserveProfileForm(this.req);
                form(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 購入者情報を保存して座席選択へ
                        // reservationModel.profile = {
                        //     last_name: this.req.form['lastName'],
                        //     first_name: this.req.form['firstName'],
                        //     email: this.req.form['email'],
                        //     tel: this.req.form['tel']
                        // };

                        reservationModel.paymentMethod = this.req.form['paymentMethod'];

                        this.logger.debug('saving reservationModel... ');
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('window.reserve.confirm', {token: token}));
                        });

                    } else {
                        this.res.render('window/reserve/profile', {
                            reservationModel: reservationModel
                        });

                    }

                });

            } else {
                this.res.locals.paymentMethod = GMOUtil.PAY_TYPE_CREDIT;

                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.paymentMethod) {
                    this.res.locals.paymentMethod = reservationModel.paymentMethod;
                }

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
                // 購入番号発行
                this.createPaymentNo((err, paymentNo) => {
                    if (err) {
                        let message = this.req.__('Message.UnexpectedError');
                        this.res.redirect(`${this.router.build('window.reserve.confirm', {token: token})}?message=${encodeURIComponent(message)}`);

                    } else {
                        reservationModel.paymentNo = paymentNo;

                        // 予約プロセス固有のログファイルをセット
                        this.setProcessLogger(reservationModel.paymentNo, () => {
                            this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);

                            let promises = [];
                            let reservationDocuments4update = reservationModel.toReservationDocuments();
                            for (let reservationDocument4update of reservationDocuments4update) {

                                promises.push(new Promise((resolve, reject) => {
                                    // 予約完了
                                    reservationDocument4update['status'] = ReservationUtil.STATUS_RESERVED;
                                    reservationDocument4update['purchased_at'] = Date.now();
                                    reservationDocument4update['window'] = this.windowUser.get('_id');
                                    reservationDocument4update['window_user_id'] = this.windowUser.get('user_id');

                                    this.logger.info('updating reservation all infos..._id:', reservationDocument4update['_id']);
                                    Models.Reservation.update(
                                        {
                                            _id: reservationDocument4update['_id'],
                                            status: ReservationUtil.STATUS_TEMPORARY
                                        },
                                        reservationDocument4update,
                                        (err, raw) => {
                                            this.logger.info('reservation updated.', err, raw);
                                            if (err) {
                                                reject(new Error(this.req.__('Message.UnexpectedError')));
                                            } else {
                                                resolve();
                                            }
                                        }
                                    );

                                }));
                            };

                            Promise.all(promises).then(() => {
                                this.logger.info('creating reservationEmailCue...');
                                Models.ReservationEmailCue.create(
                                    {
                                        payment_no: reservationModel.paymentNo,
                                        is_sent: false
                                    },
                                    (err, reservationEmailCueDocument) => {
                                        this.logger.info('reservationEmailCue created.', err, reservationEmailCueDocument);
                                        if (err) {
                                            // 失敗してもスルー(ログと運用でなんとかする)

                                        }

                                        reservationModel.remove((err) => {
                                            this.logger.info('redirecting to complete...');
                                            this.res.redirect(this.router.build('window.reserve.complete', {paymentNo: reservationModel.paymentNo}));

                                        });

                                    }
                                );

                            }, (err) => {
                                let message = err.message;
                                this.res.redirect(`${this.router.build('window.reserve.confirm', {token: token})}?message=${encodeURIComponent(message)}`);
                            });
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
                window: this.windowUser.get('_id')
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
