import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';
import CustomerReserveTermsForm from '../../../forms/Customer/Reserve/CustomerReserveTermsForm';
import CustomerReservePerformanceForm from '../../../forms/Customer/Reserve/CustomerReservePerformanceForm';
import CustomerReserveSeatForm from '../../../forms/Customer/Reserve/CustomerReserveSeatForm';
import CustomerReserveTicketForm from '../../../forms/Customer/Reserve/CustomerReserveTicketForm';
import CustomerReserveProfileForm from '../../../forms/Customer/Reserve/CustomerReserveProfileForm';
import CustomerReservePayForm from '../../../forms/Customer/Reserve/CustomerReservePayForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

export default class CustomerReserveController extends ReserveBaseController {
    /**
     * 規約
     */
    public terms(): void {
        let customerReserveTermsForm = new CustomerReserveTermsForm();
        if (this.req.method === 'POST') {

            customerReserveTermsForm.form.handle(this.req, {
                success: (form) => {
                    customerReserveTermsForm.form = form;

                    this.res.redirect(this.router.build('customer.reserve.start', {}));
                },
                error: (form) => {
                    this.res.render('customer/reserve/terms', {
                        form: form,
                    });
                },
                empty: (form) => {
                    this.res.render('customer/reserve/terms', {
                        form: form,
                    });
                }
            });
        } else {
            this.res.render('customer/reserve/terms', {
                form: customerReserveTermsForm.form
            });
        }
    }

    public start(): void {
        // 予約トークンを発行
        let token = Util.createToken();
        let reservationModel = new ReservationModel();
        reservationModel.token = token;

        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save((err) => {
            this.res.redirect(this.router.build('customer.reserve.performances', {token: token}));
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

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReservePerformanceForm = new CustomerReservePerformanceForm();
            if (this.req.method === 'POST') {

                customerReservePerformanceForm.form.handle(this.req, {
                    success: (form) => {
                        customerReservePerformanceForm.form = form;

                        // パフォーマンスFIX
                        this.processFixPerformance(reservationModel, form.data.performance_id, (err, reservationModel) => {
                            if (err) {
                                this.next(err);
                            } else {
                                this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save((err) => {
                                    this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                                });
                            }
                        });

                    },
                    error: (form) => {
                        this.next(new Error('不適切なアクセスです'));
                    },
                    empty: (form) => {
                        this.next(new Error('不適切なアクセスです'));
                    }
                });
            } else {
                // 仮予約あればキャンセルする
                this.processCancelSeats(reservationModel, (err, reservationModel) => {
                    this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save((err) => {
                        this.res.render('customer/reserve/performances', {
                            form: customerReservePerformanceForm.form
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
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReserveSeatForm = new CustomerReserveSeatForm();
            if (this.req.method === 'POST') {

                customerReserveSeatForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveSeatForm.form = form;

                        let reservationIds: Array<string> = JSON.parse(form.data.reservationIds);

                        // 座席FIX
                        this.processFixSeats(reservationModel, reservationIds, (err, reservationModel) => {
                            if (err) {
                                this.next(err);

                            } else {
                                this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save((err) => {
                                    // 仮予約に失敗した座席コードがあった場合
                                    if (reservationIds.length > reservationModel.reservationIds.length) {
                                        // TODO メッセージ？
                                        let message = '座席を確保できませんでした。再度指定してください。';
                                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}) + `?message=${encodeURIComponent(message)}`);

                                    } else {
                                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));

                                    }

                                });

                            }
                        });

                    },
                    error: (form) => {
                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                    },
                    empty: (form) => {
                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                    }
                });
            } else {
                this.res.render('customer/reserve/seats', {
                    form: customerReserveSeatForm.form,
                    reservationModel: reservationModel,
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
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReserveTicketForm = new CustomerReserveTicketForm();
            if (this.req.method === 'POST') {

                customerReserveTicketForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveTicketForm.form = form;

                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(form.data.choices);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                let reservation = reservationModel.getReservation(choice.reservation_id);
                                reservation.ticket_type = choice.ticket_type;
                                reservation.ticket_name = choice.ticket_name;
                                reservation.ticket_name_en = choice.ticket_name_en;
                                reservation.ticket_price = choice.ticket_price;

                                reservationModel.setReservation(reservation._id, reservation);
                            });

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('customer.reserve.profile', {token: token}));
                            });

                        } else {
                            this.next(new Error('不適切なアクセスです'));
                        }

                    },
                    error: (form) => {
                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));
                    },
                    empty: (form) => {
                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));
                    }
                });
            } else {
                this.res.render('customer/reserve/tickets', {
                    form: customerReserveTicketForm.form,
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
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReserveProfileForm = new CustomerReserveProfileForm();
            if (this.req.method === 'POST') {

                customerReserveProfileForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveProfileForm.form = form;

                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: form.data.last_name,
                            first_name: form.data.first_name,
                            email: form.data.email,
                            tel: form.data.tel,
                        };

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.pay', {token: token}));
                        });
                    },
                    error: (form) => {
                        this.res.render('customer/reserve/profile', {
                            form: form,
                            reservationModel: reservationModel,
                        });
                    },
                    empty: (form) => {
                        this.res.render('customer/reserve/profile', {
                            form: form,
                            reservationModel: reservationModel,
                        });
                    }
                });
            } else {
                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.profile) {
                    let email = reservationModel.profile.email;
                    customerReserveProfileForm.form.fields.last_name.value = reservationModel.profile.last_name;
                    customerReserveProfileForm.form.fields.first_name.value = reservationModel.profile.first_name;
                    customerReserveProfileForm.form.fields.tel.value = reservationModel.profile.tel;
                    customerReserveProfileForm.form.fields.email.value = email;
                    customerReserveProfileForm.form.fields.emailConfirm.value = email.substr(0, email.indexOf('@'));
                    customerReserveProfileForm.form.fields.emailConfirmDomain.value = email.substr(email.indexOf('@') + 1);
                }

                this.res.render('customer/reserve/profile', {
                    form: customerReserveProfileForm.form,
                    reservationModel: reservationModel,
                });
            }
        });
    }

    /**
     * 決済方法選択
     */
    public pay(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReservePayForm = new CustomerReservePayForm();
            if (this.req.method === 'POST') {

                customerReservePayForm.form.handle(this.req, {
                    success: (form) => {
                        customerReservePayForm.form = form;

                        // 決済方法情報を保存して座席選択へ
                        reservationModel.paymentMethod = form.data.method;

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));
                        });
                    },
                    error: (form) => {
                        this.res.render('customer/reserve/pay', {
                            form: form,
                        });
                    },
                    empty: (form) => {
                        this.res.render('customer/reserve/pay', {
                            form: form,
                        });
                    }
                });
            } else {
                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.paymentMethod) {
                    customerReservePayForm.form.fields.method.value = reservationModel.paymentMethod;
                }

                this.res.render('customer/reserve/pay', {
                    form: customerReservePayForm.form,
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

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                this.res.redirect(this.router.build('customer.reserve.process', {token: token}));
            } else {
                this.res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }

    public process(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
            } else {

                // 予約情報セッション削除
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(() => {
                    if (err) {

                    } else {
                        // GMOからの結果受信にそなえてセッションを新規に作成する
                        reservationModel.token = Util.createToken();
                        reservationModel.save((err) => {
                            // GMOへ遷移画面
                            this.res.render('customer/reserve/processGMODev', {
                                layout: false,
                                reservationModel: reservationModel
                            });
                        });
                    }
                });
            }
        });
    }

    /**
     * GMOからの結果受信
     */
    public fromGMO(): void {
        let token = this.req.body.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                // 予約情報セッション削除
                // これ以降、予約情報はローカルに引き回す
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(() => {
                    if (err) {

                    } else {
                        this.processFixAll(reservationModel, (err, reservationModel) => {
                            if (err) {
                                // TODO 万が一の対応どうするか
                                this.next(err);

                            } else {
                                // TODO 予約できていない在庫があった場合
                                if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                    this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));

                                } else {
                                    // 予約結果セッションを保存して、完了画面へ
                                    let reservationResultModel = reservationModel.toReservationResult();

                                    this.logger.debug('saving reservationResult...', reservationResultModel);
                                    reservationResultModel.save((err) => {
                                        this.res.redirect(this.router.build('customer.reserve.complete', {token: token}));
                                    });

                                }
                            }
                        });
                    }
                });
            } else {
            }
        });

    }

    public complete(): void {
        let token = this.req.params.token;
        ReservationResultModel.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.res.render('customer/reserve/complete', {
                reservationResultModel: reservationResultModel,
            });
        });
    }
}
