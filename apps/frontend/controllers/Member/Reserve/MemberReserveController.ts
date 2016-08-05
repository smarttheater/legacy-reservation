import ReserveBaseController from '../../ReserveBaseController';
import MemberUser from '../../../models/User/MemberUser';
import Constants from '../../../../common/Util/Constants';
import Util from '../../../../common/Util/Util';
import memberReserveLoginForm from '../../../forms/Member/Reserve/memberReserveLoginForm';
import reserveTicketForm from '../../../forms/Reserve/reserveTicketForm';
import reserveProfileForm from '../../../forms/Reserve/reserveProfileForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../../../models/Reserve/ReservationModel';
import moment = require('moment');

export default class MemberReserveController extends ReserveBaseController {
    /** 予約開始日時 */
    private static RESERVE_START_DATETIME = '2016-10-22T00:00:00+09:00';
    /** 予約終了日時 */
    private static RESERVE_END_DATETIME = '2016-10-24T23:59:59+09:00';

    /**
     * 規約
     */
    public terms(): void {
        // 期限指定
        let now = moment();
        if (now < moment(Constants.RESERVE_START_DATETIME) || moment(Constants.RESERVE_END_DATETIME) < now) {
            return this.next(new Error('expired.'));
        }

        // ログイン中であればプロセス開始
        if (this.memberUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('member.reserve.start', {}));
        }

        if (this.req.method === 'POST') {
            memberReserveLoginForm(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', this.req.form['user_id']);
                    Models.Member.findOne(
                        {
                            user_id: this.req.form['user_id'],
                            password: this.req.form['password'],
                        },
                        (err, memberDocument) => {
                            if (err || memberDocument === null) {
                                this.res.render('member/reserve/terms', {
                                });
                            } else {
                                // ログイン
                                this.logger.debug('logining...memberDocument:', memberDocument);
                                this.req.session[MemberUser.AUTH_SESSION_NAME] = memberDocument;

                                this.res.redirect(this.router.build('member.reserve.start', {}));
                            }
                        }
                    );

                } else {
                    this.res.render('member/reserve/terms', {
                    });

                }

            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('member/reserve/terms', {
            });

        }

    }

    public start(): void {
        // 予約状況を確認
        this.logger.debug('checking reservation status... member:', this.memberUser.get('_id'));
        Models.Reservation.find(
            {
                member: this.memberUser.get('_id'),
                status: ReservationUtil.STATUS_KEPT_BY_MEMBER
            },
            {},
            {},
            (err, reservationDocuments) => {
                // 確保中のメルマガ当選者席がなければ終了
                if (err || reservationDocuments.length < 1) {
                    this.next(new Error('すでに予約済みです'));

                } else {

                    // 予約トークンを発行
                    let token = Util.createToken();
                    let reservationModel = new ReservationModel();
                    reservationModel.token = token;
                    reservationModel.member = {
                        _id: this.memberUser.get('_id'),
                        user_id: this.memberUser.get('user_id')
                    };


                    // パフォーマンスFIX
                    this.processFixPerformance(reservationModel, this.memberUser.get('performance'), (err, reservationModel) => {
                        if (err) {
                            this.next(err);
                        } else {

                            // 確保中の座席指定情報を追加
                            for (let reservationDocument of reservationDocuments) {
                                reservationModel.reservationIds.push(reservationDocument.get('_id'));
                                reservationModel.setReservation(reservationDocument.get('_id'), {
                                    _id: reservationDocument.get('_id'),
                                    status: reservationDocument.get('status'),
                                    seat_code: reservationDocument.get('seat_code'),
                                    seat_grade_name: reservationDocument.get('seat_grade_name'),
                                    seat_grade_name_en: reservationDocument.get('seat_grade_name_en'),
                                    seat_grade_additional_charge: reservationDocument.get('seat_grade_additional_charge'),
                                });
                            }


                            // パフォーマンスと座席指定した状態で券種選択へ
                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('member.reserve.tickets', {token: token}));
                            });

                        }
                    });

                }

            }
        );

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
                            choices.forEach((choice, index) => {
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
                                this.res.redirect(this.router.build('member.reserve.profile', {token: token}));
                            });

                        } else {
                            this.next(new Error('不適切なアクセスです'));
                        }

                    } else {
                        this.res.redirect(this.router.build('member.reserve.tickets', {token: token}));

                    }

                });
            } else {
                this.res.render('member/reserve/tickets', {
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
                            this.res.redirect(this.router.build('member.reserve.confirm', {token: token}));
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

                this.res.render('member/reserve/profile', {
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
                this.res.render('member/reserve/confirm', {
                    reservationModel: reservationModel
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

            this.res.render('member/reserve/waitingSettlement', {
                reservationModel: reservationModel,
            });
        });
    }

    /**
     * complete reservation
     */
    public complete(): void {
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                status: ReservationUtil.STATUS_RESERVED,
                member: this.memberUser.get('_id')
            },
        (err, reservationDocuments) => {
            if (err || reservationDocuments.length < 1) {
                // TODO
                return this.next(new Error('invalid access.'));

            }

            // TODO force to logout
            // delete this.req.session[MemberUser.AUTH_SESSION_NAME];

            this.res.render('member/reserve/complete', {
                reservationDocuments: reservationDocuments
            });

        });

    }
}
