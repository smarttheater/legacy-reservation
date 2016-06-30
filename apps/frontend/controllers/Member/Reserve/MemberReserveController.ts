import ReserveBaseController from '../../ReserveBaseController';
import MemberUser from '../../../models/User/MemberUser';
import Util from '../../../../common/Util/Util';
import MemberReserveLoginForm from '../../../forms/Member/Reserve/MemberReserveLoginForm';
import MemberReservePerformanceForm from '../../../forms/Member/Reserve/MemberReservePerformanceForm';
import MemberReserveSeatForm from '../../../forms/Member/Reserve/MemberReserveSeatForm';
import MemberReserveTicketForm from '../../../forms/Member/Reserve/MemberReserveTicketForm';
import MemberReserveProfileForm from '../../../forms/Member/Reserve/MemberReserveProfileForm';
import MemberReservePayForm from '../../../forms/Member/Reserve/MemberReservePayForm';

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

        let memberReserveLoginForm = new MemberReserveLoginForm();
        if (this.req.method === 'POST') {

            memberReserveLoginForm.form.handle(this.req, {
                success: (form) => {
                    memberReserveLoginForm.form = form;

                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', form.data.user_id);
                    Models.Member.findOne(
                        {
                            user_id: form.data.user_id,
                            password: form.data.password,
                        },
                        (err, memberDocument) => {
                            if (err || memberDocument === null) {
                                this.res.render('member/reserve/terms', {
                                    form: form,
                                });
                            } else {
                                // ログイン
                                this.logger.debug('logining...memberDocument:', memberDocument);
                                this.req.session[MemberUser.AUTH_SESSION_NAME] = memberDocument;

                                this.res.redirect(this.router.build('member.reserve.start', {}));
                            }
                        }
                    );
                },
                error: (form) => {
                    return this.res.render('member/reserve/terms', {
                        form: form,
                    });
                },
                empty: (form) => {
                    return this.res.render('member/reserve/terms', {
                        form: form,
                    });
                }
            });
        } else {
            this.res.render('member/reserve/terms', {
                form: memberReserveLoginForm.form
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

            let memberReserveTicketForm = new MemberReserveTicketForm();
            if (this.req.method === 'POST') {

                memberReserveTicketForm.form.handle(this.req, {
                    success: (form) => {
                        memberReserveTicketForm.form = form;

                        // 座席選択情報を保存して座席選択へ
                        let choices = JSON.parse(form.data.choices);

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

                    },
                    error: (form) => {
                        this.res.redirect(this.router.build('member.reserve.tickets', {token: token}));
                    },
                    empty: (form) => {
                        this.res.redirect(this.router.build('member.reserve.tickets', {token: token}));
                    }
                });
            } else {
                this.res.render('member/reserve/tickets', {
                    form: memberReserveTicketForm.form,
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

            let memberReserveProfileForm = new MemberReserveProfileForm();
            if (this.req.method === 'POST') {

                memberReserveProfileForm.form.handle(this.req, {
                    success: (form) => {
                        memberReserveProfileForm.form = form;

                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: form.data.last_name,
                            first_name: form.data.first_name,
                            email: form.data.email,
                            tel: form.data.tel,
                        };

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('member.reserve.pay', {token: token}));
                        });
                    },
                    error: (form) => {
                        this.res.render('member/reserve/profile', {
                            form: form,
                            reservationModel: reservationModel,
                        });
                    },
                    empty: (form) => {
                        this.res.render('member/reserve/profile', {
                            form: form,
                            reservationModel: reservationModel,
                        });
                    }
                });
            } else {
                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.profile) {
                    let email = reservationModel.profile.email;
                    memberReserveProfileForm.form.fields.last_name.value = reservationModel.profile.last_name;
                    memberReserveProfileForm.form.fields.first_name.value = reservationModel.profile.first_name;
                    memberReserveProfileForm.form.fields.tel.value = reservationModel.profile.tel;
                    memberReserveProfileForm.form.fields.email.value = email;
                    memberReserveProfileForm.form.fields.emailConfirm.value = email.substr(0, email.indexOf('@'));
                    memberReserveProfileForm.form.fields.emailConfirmDomain.value = email.substr(email.indexOf('@') + 1);
                }

                this.res.render('member/reserve/profile', {
                    form: memberReserveProfileForm.form,
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

            let memberReservePayForm = new MemberReservePayForm();
            if (this.req.method === 'POST') {

                memberReservePayForm.form.handle(this.req, {
                    success: (form) => {
                        memberReservePayForm.form = form;

                        // 決済方法情報を保存して座席選択へ
                        reservationModel.paymentMethod = form.data.method;

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('member.reserve.confirm', {token: token}));
                        });
                    },
                    error: (form) => {
                        this.res.render('member/reserve/pay', {
                            form: form,
                        });
                    },
                    empty: (form) => {
                        this.res.render('member/reserve/pay', {
                            form: form,
                        });
                    }
                });
            } else {
                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.paymentMethod) {
                    memberReservePayForm.form.fields.method.value = reservationModel.paymentMethod;
                }

                this.res.render('member/reserve/pay', {
                    form: memberReservePayForm.form,
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
                this.res.redirect(this.router.build('member.reserve.process', {token: token}));
            } else {
                this.res.render('member/reserve/confirm', {
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
                            this.res.render('member/reserve/processGMODev', {
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
                                    this.res.redirect(this.router.build('member.reserve.confirm', {token: token}));
                                } else {
                                    // 予約結果セッションを保存して、完了画面へ
                                    let reservationResultModel = reservationModel.toReservationResult();

                                    this.logger.debug('saving reservationResult...', reservationResultModel);
                                    reservationResultModel.save((err) => {
                                        this.res.redirect(this.router.build('member.reserve.complete', {token: token}));
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

            this.res.render('member/reserve/complete', {
                reservationResultModel: reservationResultModel,
            });
        });
    }
}
