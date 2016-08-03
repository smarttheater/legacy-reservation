import ReserveBaseController from '../../ReserveBaseController';
import MvtkUser from '../../../models/User/MvtkUser';
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
import mvtkService = require('@motionpicture/mvtk-service');

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
                        reservationModel.save((err) => {
                            this.res.redirect(`${this.router.build('customer.login')}?cb=${encodeURIComponent(this.router.build('customer.reserve.seats', {token: token}))}`);

                        });
                    }
                });

            } else {
                this.next(new Error('invalid access.'));

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

                        reservationModel.mvtkMemberInfoResult = this.mvtkUser.memberInfoResult;

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
                let email = this.mvtkUser.memberInfoResult.kiinMladdr;
                this.res.locals.lastName = this.mvtkUser.memberInfoResult.kiinsiNm;
                this.res.locals.firstName = this.mvtkUser.memberInfoResult.kiimmiNm;
                this.res.locals.tel = `${this.mvtkUser.memberInfoResult.kiinshgikykNo}${this.mvtkUser.memberInfoResult.kiinshnikykNo}${this.mvtkUser.memberInfoResult.kiinknyshNo}`;
                this.res.locals.email = email;
                this.res.locals.emailConfirm = email.substr(0, email.indexOf('@'));
                this.res.locals.emailConfirmDomain = email.substr(email.indexOf('@') + 1);

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
                // ここで予約番号発行
                reservationModel.paymentNo = Util.createPaymentNo();

                // 予約プロセス固有のログファイルをセット
                this.setProcessLogger(reservationModel.paymentNo, () => {
                    this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);


                    // いったん全情報をDBに保存
                    let promises = [];
                    let reservationDocuments4update = reservationModel.toReservationDocuments();
                    for (let reservationDocument4update of reservationDocuments4update) {
                        promises.push(new Promise((resolve, reject) => {

                            this.logger.info('updating reservation all infos..._id:', reservationDocument4update['_id']);
                            Models.Reservation.findOneAndUpdate(
                                {
                                    _id: reservationDocument4update['_id'],
                                },
                                reservationDocument4update,
                            (err, reservationDocument) => {
                                this.logger.info('STATUS_TEMPORARY to STATUS_RESERVED processed.', err, reservationDocument);

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
                        reservationModel.save((err) => {
                            this.logger.info('starting GMO payment...');
                            this.res.redirect(this.router.build('gmo.reserve.start', {token: token}));

                        });

                    }, (err) => {
                        this.res.render('customer/reserve/confirm', {
                            reservationModel: reservationModel,
                            ReservationUtil: ReservationUtil
                        });

                    });

                });

            } else {
                this.res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel,
                    ReservationUtil: ReservationUtil
                });

            }
        });
    }

    public waitingSettlement(): void {
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find({payment_no: paymentNo}, (err, reservationDocuments) => {
            if (err) {
                // TODO

            }

            this.res.render('customer/reserve/waitingSettlement', {
                reservationDocuments: reservationDocuments
            });

        });
    }

    public complete(): void {
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find({payment_no: paymentNo}, (err, reservationDocuments) => {
            if (err) {
                // TODO

            }

            this.res.render('customer/reserve/complete', {
                reservationDocuments: reservationDocuments
            });

        });
    }
}
