import ReserveBaseController from '../../ReserveBaseController';
import MemberUser from '../../../models/User/MemberUser';
import Util from '../../../../common/Util/Util';
import memberReserveLoginForm from '../../../forms/Member/Reserve/memberReserveLoginForm';
import memberReserveTicketForm from '../../../forms/Member/Reserve/memberReserveTicketForm';
import memberReserveProfileForm from '../../../forms/Member/Reserve/memberReserveProfileForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

export default class MemberReserveController extends ReserveBaseController {
    /**
     * 規約
     */
    public terms(): void {
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
                                    token: token,
                                    _id: reservationDocument.get('_id'),
                                    status: reservationDocument.get('status'),
                                    seat_code: reservationDocument.get('seat_code'),
                                    performance: this.memberUser.get('performance'),
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

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                memberReserveTicketForm(this.req, this.res, (err) => {
                    if (this.req.form.isValid) {
                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(this.req.form['choices']);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice, index) => {
                                let reservation = reservationModel.getReservation(choice.reservation_id);
                                reservation.ticket_type = choice.ticket_type;
                                reservation.ticket_name = choice.ticket_name;
                                reservation.ticket_name_en = choice.ticket_name_en;
                                reservation.ticket_price = choice.ticket_price;

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

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                memberReserveProfileForm(this.req, this.res, (err) => {
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

            this.logger.debug('reservationModel is ', reservationModel);

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

    public complete(): void {
        let token = this.req.params.token;
        ReservationResultModel.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.res.render('member/reserve/complete', {
                reservationResultModel: reservationResultModel,
            });
        });
    }
}
