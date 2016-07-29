import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';
import reserveTermsForm from '../../../forms/Reserve/reserveTermsForm';
import reservePerformanceForm from '../../../forms/Reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/Reserve/reserveSeatForm';
import reserveTicketForm from '../../../forms/Reserve/reserveTicketForm';
import reserveProfileForm from '../../../forms/Reserve/reserveProfileForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import FilmUtil from '../../../../common/models/Film/FilmUtil';

import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

import moment = require('moment');
import crypto = require('crypto');

export default class CustomerReserveController extends ReserveBaseController {
    /**
     * スケジュール選択
     */
    public performances(): void {
        if (this.req.method === 'POST') {
            reservePerformanceForm(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    this.res.redirect(307, this.router.build('customer.reserve.start'));

                } else {
                    this.res.render('customer/reserve/performances', {
                    });

                }

            });
        } else {
            this.res.render('customer/reserve/performances', {
                FilmUtil: FilmUtil
            });

        }
    }

    /**
     * ポータルからパフォーマンス指定でPOSTされてくる
     */
    public start(): void {

        reservePerformanceForm(this.req, this.res, (err) => {
            if (this.req.form.isValid) {

                // 予約トークンを発行
                let token = Util.createToken();
                let reservationModel = new ReservationModel();
                reservationModel.token = token;

                // パフォーマンスFIX
                this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                    if (err) {
                        this.next(err);
                    } else {
                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.terms', {token: token}));
                        });
                    }
                });

            } else {
                this.next(new Error('invalid access.'));

            }

        });

    }

    /**
     * 規約
     */
    public terms(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            if (this.req.method === 'POST') {
                let form = reserveTermsForm(this.req);
                form(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));

                    } else {
                        this.res.render('customer/reserve/terms', {
                        });

                    }

                });
            } else {
                this.res.render('customer/reserve/terms', {
                });

            }

        });
    }

    /**
     * 座席選択
     */
    public seats(): void {
        let limit = 4; // 最大座席確保枚数

        // TODO 1アカウント1パフォーマンスごとに枚数制限
        // ここで、ログインユーザーの予約枚数をチェックする

        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel.toLog());

            if (this.req.method === 'POST') {
                reserveSeatForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        let reservationIds: Array<string> = JSON.parse(this.req.form['reservationIds']);

                        // ブラウザ側でも枚数チェックしているが、念のため
                        if (reservationIds.length > limit) {
                            return this.next(new Error('invalid access.'));
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
                                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}) + `?message=${encodeURIComponent(message)}`);

                                    } else {
                                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));

                                    }

                                });

                            }
                        });

                    } else {
                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));

                    }

                });
            } else {
                this.res.render('customer/reserve/seats', {
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
                                reservation.ticket_type_code = choice.ticket_type_code;
                                reservation.ticket_type_name = choice.ticket_type_name;
                                reservation.ticket_type_name_en = choice.ticket_type_name_en;
                                reservation.ticket_type_charge = parseInt(choice.ticket_type_charge);

                                reservationModel.setReservation(reservation._id, reservation);
                            });

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('customer.reserve.profile', {token: token}));
                            });

                        } else {
                            this.next(new Error('不適切なアクセスです'));
                        }

                    } else {
                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));

                    }

                });
            } else {
                this.res.render('customer/reserve/tickets', {
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
                let form = reserveProfileForm(this.req);
                form(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: this.req.form['lastName'],
                            first_name: this.req.form['firstName'],
                            email: this.req.form['email'],
                            tel: this.req.form['tel']
                        };

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));
                        });

                    } else {
                        this.res.render('customer/reserve/profile', {
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

                if (process.env.NODE_ENV === 'dev') {
                    this.res.locals.lastName = 'てすとせい';
                    this.res.locals.firstName = 'てすとめい';
                    this.res.locals.tel = '09012345678';
                    this.res.locals.email = 'ilovegadd@gmail.com';
                    this.res.locals.emailConfirm = 'ilovegadd';
                    this.res.locals.emailConfirmDomain = 'gmail.com';
                }

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

                this.res.render('customer/reserve/profile', {
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
                this.res.redirect(this.router.build('gmo.reserve.start', {token: token}));
            } else {
                this.res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel,
                    ReservationUtil: ReservationUtil
                });
            }
        });
    }

    public waitingSettlement(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.res.render('customer/reserve/waitingSettlement', {
                reservationModel: reservationModel,
            });
        });
    }

    public complete(): void {
        let token = this.req.params.token;
        ReservationResultModel.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.res.render('customer/reserve/complete', {
                reservationResultModel: reservationResultModel
            });
        });
    }
}
