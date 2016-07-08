import ReserveBaseController from '../../ReserveBaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import Util from '../../../../common/Util/Util';
import sponsorReservePerformanceForm from '../../../forms/Sponsor/Reserve/sponsorReservePerformanceForm';
import sponsorReserveSeatForm from '../../../forms/Sponsor/Reserve/sponsorReserveSeatForm';
import sponsorReserveTicketForm from '../../../forms/Sponsor/Reserve/sponsorReserveTicketForm';
import sponsorReserveProfileForm from '../../../forms/Sponsor/Reserve/sponsorReserveProfileForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

export default class SponsorReserveController extends ReserveBaseController {
    public start(): void {
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


        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save((err) => {
            this.res.redirect(this.router.build('sponsor.reserve.performances', {token: token}));
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
                sponsorReservePerformanceForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // パフォーマンスFIX
                        this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                            if (err) {
                                this.next(err);
                            } else {

                                this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save((err) => {
                                    this.res.redirect(this.router.build('sponsor.reserve.seats', {token: token}));
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
                        this.res.render('sponsor/reserve/performances', {
                            layout: 'layouts/sponsor/layout',
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

            this.logger.debug('reservationModel is ', reservationModel.toLog());


            // 外部関係者による予約数を取得
            Models.Reservation.count(
            {
                sponsor: this.sponsorUser.get('_id')
            },
            (err, reservationsCount) => {

                if (this.req.method === 'POST') {
                    sponsorReserveSeatForm(this.req, this.res, (err) => {
                        if (this.req.form.isValid) {

                            let reservationIds: Array<string> = JSON.parse(this.req.form['reservationIds']);

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

                        } else {
                            this.res.redirect(this.router.build('sponsor.reserve.seats', {token: token}));

                        }

                    });
                } else {
                    this.res.render('sponsor/reserve/seats', {
                        layout: 'layouts/sponsor/layout',
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

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            if (this.req.method === 'POST') {
                sponsorReserveTicketForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {

                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(this.req.form['choices']);

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

                    } else {
                        this.res.redirect(this.router.build('sponsor.reserve.tickets', {token: token}));

                    }

                });
            } else {
                this.res.render('sponsor/reserve/tickets', {
                    layout: 'layouts/sponsor/layout',
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

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            if (this.req.method === 'POST') {
                sponsorReserveProfileForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {

                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: this.req.form['lastName'],
                            first_name: this.req.form['firstName'],
                            email: this.req.form['email'],
                            tel: this.req.form['tel'],
                        };

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('sponsor.reserve.confirm', {token: token}));
                        });

                    } else {
                        this.res.render('sponsor/reserve/profile', {
                            layout: 'layouts/sponsor/layout',
                            reservationModel: reservationModel,
                        });

                    }

                });

            } else {
                this.res.locals.lastName = '';
                this.res.locals.firstName = '';
                this.res.locals.tel = '';
                this.res.locals.email = '';
                this.res.locals.emailConfirm = '';
                this.res.locals.emailConfirmDomain = '';

                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.profile) {
                    let email = reservationModel.profile.email;
                    this.res.locals.lastName = reservationModel.profile.last_name;
                    this.res.locals.firstName = reservationModel.profile.first_name;
                    this.res.locals.tel = reservationModel.profile.tel;
                    this.res.locals.email = email;
                    this.res.locals.emailConfirm = email.substr(0, email.indexOf('@'));
                    this.res.locals.emailConfirmDomain = email.substr(email.indexOf('@') + 1);
                }

                this.res.render('sponsor/reserve/profile', {
                    layout: 'layouts/sponsor/layout',
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

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            if (this.req.method === 'POST') {
            } else {
                // 予約情報セッション削除
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(() => {
                    if (err) {

                    } else {

                        // ここで予約番号発行
                        reservationModel.paymentNo = Util.createPaymentNo();

                        // 予約プロセス固有のログファイルをセット
                        this.setProcessLogger(reservationModel.paymentNo, () => {
                            this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);
                            this.logger.info('fixing all...');
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

                                        this.logger.info('saving reservationResult...', reservationResultModel.toLog());
                                        reservationResultModel.save((err) => {
                                            this.logger.info('redirecting to complete...');
                                            this.res.redirect(this.router.build('sponsor.reserve.complete', {token: token}));
                                        });

                                    }

                                }
                            });

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
