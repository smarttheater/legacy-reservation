import ReserveBaseController from '../../ReserveBaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import Util from '../../../../common/Util/Util';
import SponsorReserveTermsForm from '../../../forms/Sponsor/Reserve/SponsorReserveTermsForm';
import SponsorReservePerformanceForm from '../../../forms/Sponsor/Reserve/SponsorReservePerformanceForm';
import SponsorReserveSeatForm from '../../../forms/Sponsor/Reserve/SponsorReserveSeatForm';
import SponsorReserveTicketForm from '../../../forms/Sponsor/Reserve/SponsorReserveTicketForm';
import SponsorReserveProfileForm from '../../../forms/Sponsor/Reserve/SponsorReserveProfileForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

export default class SponsorReserveController extends ReserveBaseController {
    /**
     * 規約
     */
    public terms(): void {
        if (this.sponsorUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('sponsor.reserve.performances', {}));
        }

        let sponsorReserveTermsForm = new SponsorReserveTermsForm();
        if (this.req.method === 'POST') {

            sponsorReserveTermsForm.form.handle(this.req, {
                success: (form) => {
                    sponsorReserveTermsForm.form = form;

                    this.res.redirect(this.router.build('sponsor.reserve.performances', {}));
                },
                error: (form) => {
                    this.res.render('sponsor/reserve/terms', {
                        layout: 'layouts/sponsor/layout',
                        sponsorReserveLoginForm: form,
                    });
                },
                empty: (form) => {
                    this.res.render('sponsor/reserve/terms', {
                        layout: 'layouts/sponsor/layout',
                        sponsorReserveLoginForm: form,
                    });
                }
            });


        } else {
            this.res.render('sponsor/reserve/terms', {
                layout: 'layouts/sponsor/layout',
                form: sponsorReserveTermsForm.form,
            });
        }
    }

    /**
     * スケジュール選択
     */
    public performances(): void {
        let sponsorReservePerformanceForm = new SponsorReservePerformanceForm();
        if (this.req.method === 'POST') {

            sponsorReservePerformanceForm.form.handle(this.req, {
                success: (form) => {
                    sponsorReservePerformanceForm.form = form;

                    // 予約トークンを発行
                    let token = Util.createToken();
                    let reservationModel = new ReservationModel();
                    reservationModel.token = token;
                    reservationModel.sponsor = {
                        _id: this.sponsorUser.get('_id'),
                        user_id: this.sponsorUser.get('user_id'),
                        name: this.sponsorUser.get('name'),
                        email: this.sponsorUser.get('email'),
                    };


                    // パフォーマンスFIX
                    this.processFixPerformance(reservationModel, form.data.performance_id, (err, reservationModel) => {
                        if (err) {
                            this.next(err);
                        } else {

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('sponsor.reserve.seats', {token: token}));
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
            this.res.render('sponsor/reserve/performances', {
                layout: 'layouts/sponsor/layout',
                form: sponsorReservePerformanceForm.form
            });
        }
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


            // 外部関係者による予約数を取得
            Models.Reservation.count(
            {
                sponsor: this.sponsorUser.get('_id')
            },
            (err, reservationsCount) => {

                let sponsorReserveSeatForm = new SponsorReserveSeatForm();
                if (this.req.method === 'POST') {

                    sponsorReserveSeatForm.form.handle(this.req, {
                        success: (form) => {
                            sponsorReserveSeatForm.form = form;

                            let reservationIds: Array<string> = JSON.parse(form.data.reservationIds);

                            // 座席指定可能数チェック
                            if (reservationIds.length > parseInt(this.sponsorUser.get('max_reservation_count')) - reservationsCount) {
                                let message = '座席指定可能枚数を超えました。';
                                return this.res.redirect(this.router.build('sponsor.reserve.seats', {token: token}) + `?message=${encodeURIComponent(message)}`);
                            }


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
                                            this.res.redirect(this.router.build('sponsor.reserve.seats', {token: token}) + `?message=${encodeURIComponent(message)}`);
                                        } else {
                                            this.res.redirect(this.router.build('sponsor.reserve.tickets', {token: token}));
                                        }

                                    });

                                }
                            });

                        },
                        error: (form) => {
                            this.res.redirect(this.router.build('sponsor.reserve.seats', {token: token}));
                        },
                        empty: (form) => {
                            this.res.redirect(this.router.build('sponsor.reserve.seats', {token: token}));
                        }
                    });
                } else {
                    this.res.render('sponsor/reserve/seats', {
                        layout: 'layouts/sponsor/layout',
                        form: sponsorReserveSeatForm.form,
                        reservationModel: reservationModel,
                        reservationsCount: reservationsCount,
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

            this.logger.debug('reservationModel is ', reservationModel);

            let sponsorReserveTicketForm = new SponsorReserveTicketForm();
            if (this.req.method === 'POST') {

                sponsorReserveTicketForm.form.handle(this.req, {
                    success: (form) => {
                        sponsorReserveTicketForm.form = form;

                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(form.data.choices);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                let reservation = reservationModel.getReservation(choice.reservation_id);
                                reservation.ticket_type = choice.ticket_type;
                                reservation.ticket_name = choice.ticket_name;
                                reservation.ticket_name_en = choice.ticket_name_en;
                                reservation.ticket_price = choice.ticket_price;
                                reservation.watcher_name = choice.watcher_name;

                                reservationModel.setReservation(reservation._id, reservation);
                            });

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('sponsor.reserve.profile', {token: token}));
                            });

                        } else {
                            this.next(new Error('不適切なアクセスです'));
                        }

                    },
                    error: (form) => {
                        this.res.redirect(this.router.build('sponsor.reserve.tickets', {token: token}));
                    },
                    empty: (form) => {
                        this.res.redirect(this.router.build('sponsor.reserve.tickets', {token: token}));
                    }
                });
            } else {
                this.res.render('sponsor/reserve/tickets', {
                    layout: 'layouts/sponsor/layout',
                    form: sponsorReserveTicketForm.form,
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

            let sponsorReserveProfileForm = new SponsorReserveProfileForm();
            if (this.req.method === 'POST') {

                sponsorReserveProfileForm.form.handle(this.req, {
                    success: (form) => {
                        sponsorReserveProfileForm.form = form;

                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: form.data.last_name,
                            first_name: form.data.first_name,
                            email: form.data.email,
                            tel: form.data.tel,
                        };

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('sponsor.reserve.confirm', {token: token}));
                        });
                    },
                    error: (form) => {
                        this.res.render('sponsor/reserve/profile', {
                            layout: 'layouts/sponsor/layout',
                            form: form,
                            reservationModel: reservationModel,
                        });
                    },
                    empty: (form) => {
                        this.res.render('sponsor/reserve/profile', {
                            layout: 'layouts/sponsor/layout',
                            form: form,
                            reservationModel: reservationModel,
                        });
                    }
                });
            } else {
                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.profile) {
                    let email = reservationModel.profile.email;
                    sponsorReserveProfileForm.form.fields.last_name.value = reservationModel.profile.last_name;
                    sponsorReserveProfileForm.form.fields.first_name.value = reservationModel.profile.first_name;
                    sponsorReserveProfileForm.form.fields.tel.value = reservationModel.profile.tel;
                    sponsorReserveProfileForm.form.fields.email.value = email;
                    sponsorReserveProfileForm.form.fields.emailConfirm.value = email.substr(0, email.indexOf('@'));
                    sponsorReserveProfileForm.form.fields.emailConfirmDomain.value = email.substr(email.indexOf('@') + 1);
                }

                this.res.render('sponsor/reserve/profile', {
                    layout: 'layouts/sponsor/layout',
                    form: sponsorReserveProfileForm.form,
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
                this.res.redirect(this.router.build('sponsor.reserve.process', {token: token}));
            } else {
                this.res.render('sponsor/reserve/confirm', {
                    layout: 'layouts/sponsor/layout',
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
                        this.processFixAll(reservationModel, (err, reservationModel) => {
                            if (err) {
                                // TODO 万が一の対応どうするか
                                this.next(err);

                            } else {
                                // TODO 予約できていない在庫があった場合
                                if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                    this.res.redirect(this.router.build('sponsor.reserve.confirm', {token: token}));

                                } else {
                                    // 予約結果セッションを保存して、完了画面へ
                                    let reservationResultModel = reservationModel.toReservationResult();

                                    this.logger.debug('saving reservationResult...', reservationResultModel);
                                    reservationResultModel.save((err) => {
                                        this.res.redirect(this.router.build('sponsor.reserve.complete', {token: token}));
                                    });

                                }
                            }
                        });
                    }
                });
            }
        });
    }

    public complete(): void {
        let token = this.req.params.token;
        ReservationResultModel.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.res.render('sponsor/reserve/complete', {
                layout: 'layouts/sponsor/layout',
                reservationResultModel: reservationResultModel,
            });
        });
    }
}
