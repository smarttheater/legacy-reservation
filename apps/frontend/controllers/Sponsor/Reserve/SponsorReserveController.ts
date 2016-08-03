import ReserveBaseController from '../../ReserveBaseController';
import SponsorUser from '../../../models/User/SponsorUser';
import Util from '../../../../common/Util/Util';
import reservePerformanceForm from '../../../forms/Reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/Reserve/reserveSeatForm';
import reserveTicketForm from '../../../forms/Reserve/reserveTicketForm';
import reserveProfileForm from '../../../forms/Reserve/reserveProfileForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import FilmUtil from '../../../../common/models/Film/FilmUtil';
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

            // 外部関係者による予約数を取得
            Models.Reservation.count(
                {
                    sponsor: this.sponsorUser.get('_id'),
                    status: {
                        $ne: ReservationUtil.STATUS_AVAILABLE
                    }
                },
            (err, reservationsCount) => {
                if (parseInt(this.sponsorUser.get('max_reservation_count')) <= reservationsCount) {
                    return this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', {limit: this.sponsorUser.get('max_reservation_count')})));
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
                                FilmUtil: FilmUtil,
                                reservationsCount: reservationsCount
                            });
                        });
                    });

                }

            });

        });
    }

    /**
     * 座席選択
     */
    public seats(): void {
        // TODO 最勝ちで、残り枚数を厳密に守る(ユーザーにロックかける)


        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel.toLog());


            // 外部関係者による予約数を取得
            Models.Reservation.count(
                {
                    sponsor: this.sponsorUser.get('_id'),
                    status: {
                        $ne: ReservationUtil.STATUS_AVAILABLE
                    }
                },
            (err, reservationsCount) => {

                if (this.req.method === 'POST') {
                    reserveSeatForm(this.req, this.res, (err) => {
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
                        reservationsCount: reservationsCount
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
     * TODO 同セッション内では、情報を保持する
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
                            tel: this.req.form['tel'],
                        };

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            // ユーザーセッションにプローフィール格納
                            this.sponsorUser.profile = {
                                last_name: this.req.form['lastName'],
                                first_name: this.req.form['firstName'],
                                email: this.req.form['email'],
                                tel: this.req.form['tel']
                            };
                            this.req.session[SponsorUser.AUTH_SESSION_NAME] = this.sponsorUser;

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

                // ユーザーセッションに情報があれば、フォーム初期値設定
                if (this.sponsorUser.profile) {
                    let email = this.sponsorUser.profile.email;
                    this.res.locals.lastName = this.sponsorUser.profile.last_name;
                    this.res.locals.firstName = this.sponsorUser.profile.first_name;
                    this.res.locals.tel = this.sponsorUser.profile.tel;
                    this.res.locals.email = email;
                    this.res.locals.emailConfirm = email.substr(0, email.indexOf('@'));
                    this.res.locals.emailConfirmDomain = email.substr(email.indexOf('@') + 1);
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
                            Models.Reservation.findOneAndUpdate(
                                {
                                    _id: reservationDocument4update['_id'],
                                },
                                reservationDocument4update,
                                {
                                    new: true
                                },
                            (err, reservationDocument) => {
                                this.logger.info('reservation updated.', err, reservationDocument);

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
                            this.res.redirect(this.router.build('sponsor.reserve.complete', {paymentNo: reservationModel.paymentNo}));

                        });

                    }, (err) => {
                        this.res.render('sponsor/reserve/confirm', {
                            layout: 'layouts/sponsor/layout',
                            reservationModel: reservationModel
                        });

                    });

                });

            } else {
                this.res.render('sponsor/reserve/confirm', {
                    layout: 'layouts/sponsor/layout',
                    reservationModel: reservationModel
                });
            }
        });
    }

    /**
     * TODO 続けて予約するボタンを追加
     */
    public complete(): void {
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                status: ReservationUtil.STATUS_RESERVED,
                sponsor: this.sponsorUser.get('_id')
            },
        (err, reservationDocuments) => {
            if (err || reservationDocuments.length < 1) {
                // TODO
                return this.next(new Error('invalid access.'));

            }

            this.res.render('sponsor/reserve/complete', {
                layout: 'layouts/sponsor/layout',
                reservationDocuments: reservationDocuments
            });

        });

    }
}
