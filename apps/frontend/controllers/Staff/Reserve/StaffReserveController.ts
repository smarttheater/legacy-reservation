import ReserveBaseController from '../../ReserveBaseController';
import StaffUser from '../../../models/User/StaffUser';
import Util from '../../../../common/Util/Util';
import reservePerformanceForm from '../../../forms/Reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/Reserve/reserveSeatForm';
import reserveTicketForm from '../../../forms/Reserve/reserveTicketForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import FilmUtil from '../../../../common/models/Film/FilmUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';

export default class StaffReserveController extends ReserveBaseController {
    public start(): void {
        // 予約トークンを発行
        let token = Util.createToken();
        let reservationModel = new ReservationModel();
        reservationModel.token = token;
        reservationModel.staff = {
            _id: this.staffUser.get('_id'),
            user_id: this.staffUser.get('user_id'),
            name: this.staffUser.get('name'),
            email: this.staffUser.get('email'),
            department_name: this.staffUser.get('department_name'),
            tel: this.staffUser.get('tel'),
            signature: this.staffUser.get('signature'),
        };

        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save((err) => {
            this.res.redirect(this.router.build('staff.reserve.performances', {token: token}));
        });

    }

    /**
     * スケジュール選択
     */
    public performances(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

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
                        this.next(new Error('不適切なアクセスです'));

                    }

                });
            } else {
                // 仮予約あればキャンセルする
                this.processCancelSeats(reservationModel, (err, reservationModel) => {
                    this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save((err) => {
                        this.res.render('staff/reserve/performances', {
                            layout: 'layouts/staff/layout',
                            FilmUtil: FilmUtil
                        });
                    });
                });

            }

        });
    }

    /**
     * 座席選択
     * 
     * TODO 1パフォーマンスにつき何件まで？？？
     */
    public seats(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            // 外部関係者による予約数を取得
            Models.Reservation.count(
            {
                staff: this.staffUser.get('_id')
            },
            (err, reservationsCount) => {

                if (this.req.method === 'POST') {
                    reserveSeatForm(this.req, this.res, (err) => {
                        if (this.req.form.isValid) {

                            let reservationIds: Array<string> = JSON.parse(this.req.form['reservationIds']);

                            // 座席FIX
                            this.processFixSeats(reservationModel, reservationIds, (err, reservationModel) => {
                                if (err) {
                                    this.next(err);

                                } else {
                                    this.logger.debug('saving reservationModel... ', reservationModel);
                                    reservationModel.save((err) => {
                                        // 仮押さえできていない在庫があった場合
                                        if (reservationIds.length > reservationModel.reservationIds.length) {
                                            // TODO メッセージ？
                                            let message = '座席を確保できませんでした。再度指定してください。';
                                            this.res.redirect(this.router.build('staff.reserve.seats', {token: token}) + `?message=${encodeURIComponent(message)}`);
                                        } else {
                                            this.res.redirect(this.router.build('staff.reserve.tickets', {token: token}));
                                        }
                                    });

                                }
                            });

                        } else {
                            this.res.redirect(this.router.build('staff.reserve.seats', {token: token}));

                        }

                    });
                } else {
                    this.res.render('staff/reserve/seats', {
                        layout: 'layouts/staff/layout',
                        reservationModel: reservationModel,
                    });

                }

            });
        });
    }

    /**
     * 券種選択
     */
    public tickets(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            if (this.req.method === 'POST') {
                reserveTicketForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {

                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(this.req.form['choices']);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                let reservation = reservationModel.getReservation(choice.reservation_id);

                                let ticketType = reservationModel.ticketTypes.find((ticketType) => {
                                    return (ticketType.code === choice.ticket_type_code);
                                });
                                if (!ticketType) {
                                    return this.next(new Error('不適切なアクセスです'));
                                }

                                reservation.ticket_type_code = ticketType.code;
                                reservation.ticket_type_name = ticketType.name;
                                reservation.ticket_type_name_en = ticketType.name_en;
                                reservation.ticket_type_charge = ticketType.charge;;
                                reservation.watcher_name = choice.watcher_name;

                                reservationModel.setReservation(reservation._id, reservation);
                            });

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('staff.reserve.confirm', {token: token}));
                            });

                        } else {
                            this.next(new Error('不適切なアクセスです'));
                        }

                    } else {
                        this.res.redirect(this.router.build('staff.reserve.tickets', {token: token}));

                    }

                });
            } else {
                this.res.render('staff/reserve/tickets', {
                    layout: 'layouts/staff/layout',
                    reservationModel: reservationModel,
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
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            if (this.req.method === 'POST') {
                // ここで予約番号発行
                reservationModel.paymentNo = Util.createPaymentNo();

                // 予約プロセス固有のログファイルをセット
                this.setProcessLogger(reservationModel.paymentNo, () => {
                    this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);

                    let promises = [];
                    let reservationDocuments4update = reservationModel.toReservationDocuments();
                    for (let reservationDocument4update of reservationDocuments4update) {

                        promises.push(new Promise((resolve, reject) => {
                            // 予約完了
                            reservationDocument4update['status'] = ReservationUtil.STATUS_RESERVED;

                            this.logger.info('updating reservation all infos..._id:', reservationDocument4update['_id']);
                            Models.Reservation.update(
                                {
                                    _id: reservationDocument4update['_id'],
                                },
                                reservationDocument4update,
                            (err, raw) => {
                                this.logger.info('reservation updated.', err, raw);

                                if (err) {
                                    // TODO ログ出力
                                    reject();

                                } else {
                                    resolve();

                                }

                            });

                        }));
                    };

                    Promise.all(promises).then(() => {
                        reservationModel.remove((err) => {
                            this.logger.info('redirecting to complete...');
                            this.res.redirect(this.router.build('staff.reserve.complete', {paymentNo: reservationModel.paymentNo}));

                        });

                    }, (err) => {
                        this.res.render('staff/reserve/confirm', {
                            layout: 'layouts/staff/layout',
                            reservationModel: reservationModel
                        });

                    });

                });

            } else {
                this.res.render('staff/reserve/confirm', {
                    layout: 'layouts/staff/layout',
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
                staff: this.staffUser.get('_id')
            },
        (err, reservationDocuments) => {
            if (err || reservationDocuments.length < 1) {
                // TODO
                return this.next(new Error('invalid access.'));

            }

            this.res.render('staff/reserve/complete', {
                layout: 'layouts/staff/layout',
                reservationDocuments: reservationDocuments
            });

        });

    }
}
