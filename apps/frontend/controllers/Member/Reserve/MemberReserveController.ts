import ReserveBaseController from '../../ReserveBaseController';
import MemberUser from '../../../models/User/MemberUser';
import Constants from '../../../../common/Util/Constants';
import Util from '../../../../common/Util/Util';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import memberReserveLoginForm from '../../../forms/Member/Reserve/memberReserveLoginForm';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import moment = require('moment');

export default class MemberReserveController extends ReserveBaseController {
    public layout = 'layouts/member/layout';

    /** 予約開始日時 */
    private static RESERVE_START_DATETIME = '2016-10-22T00:00:00+09:00';
    /** 予約終了日時 */
    private static RESERVE_END_DATETIME = '2016-10-24T23:59:59+09:00';

    /**
     * 規約
     */
    public terms(): void {
        // 期限指定
        if (process.env.NODE_ENV === 'prod') {
            let now = moment();
            if (now < moment(Constants.RESERVE_START_DATETIME) || moment(Constants.RESERVE_END_DATETIME) < now) {
                return this.next(new Error('expired.'));
            }
        }

        // ログイン中であればプロセス開始
        // if (this.req.memberUser.isAuthenticated()) {
        //     return this.res.redirect(this.router.build('member.reserve.start', {}));
        // }

        if (this.req.method === 'POST') {
            memberReserveLoginForm(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    // ユーザー認証
                    this.logger.debug('finding member... user_id:', this.req.form['userId']);
                    Models.Member.findOne(
                        {
                            user_id: this.req.form['userId'],
                            password: this.req.form['password'],
                        },
                        (err, member) => {
                            if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                            if (!member) {
                                this.req.form.errors.push('ログイン番号またはパスワードに誤りがあります');
                                this.res.render('member/reserve/terms');
                            } else {
                                // 予約の有無を確認
                                Models.Reservation.count(
                                    {
                                        member: member.get('_id'),
                                        purchaser_group: ReservationUtil.PURCHASER_GROUP_MEMBER,
                                        status: ReservationUtil.STATUS_KEPT_BY_MEMBER
                                    },
                                    (err, count) => {
                                        if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                                        if (count === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                                        // ログイン
                                        this.logger.debug('logining...member:', member);
                                        this.req.session[MemberUser.AUTH_SESSION_NAME] = member.toObject();

                                        this.res.redirect(this.router.build('member.reserve.start', {}));
                                    }
                                );
                            }
                        }
                    );
                } else {
                    this.res.render('member/reserve/terms');
                }
            });
        } else {
            this.res.locals.userId = '';
            this.res.locals.password = '';

            this.res.render('member/reserve/terms');
        }
    }

    public start(): void {
        // 予約状況を確認
        this.logger.debug('checking reservation status... member:', this.req.memberUser.get('_id'));
        Models.Reservation.find(
            {
                member: this.req.memberUser.get('_id'),
                purchaser_group: ReservationUtil.PURCHASER_GROUP_MEMBER,
                status: ReservationUtil.STATUS_KEPT_BY_MEMBER
            },
            'performance seat_code status',
            (err, reservations) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                // 予約トークンを発行
                let token = Util.createToken();
                let reservationModel = new ReservationModel();
                reservationModel.token = token;
                reservationModel.purchaserGroup = ReservationUtil.PURCHASER_GROUP_MEMBER;
                reservationModel = this.initializePurchaser(reservationModel);

                // パフォーマンスFIX
                this.processFixPerformance(reservationModel, reservations[0].get('performance').toString(), (err, reservationModel) => {
                    if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));

                    // 座席FIX
                    for (let reservation of reservations) {
                        let seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                            return (seat.code === reservation.get('seat_code'));
                        });

                        reservationModel.seatCodes.push(reservation.get('seat_code'));
                        reservationModel.setReservation(reservation.get('seat_code'), {
                            _id: reservation.get('_id'),
                            status: reservation.get('status'),
                            seat_code: reservation.get('seat_code'),
                            seat_grade_name: seatInfo.grade.name,
                            seat_grade_name_en: seatInfo.grade.name_en,
                            seat_grade_additional_charge: seatInfo.grade.additional_charge
                        });
                    }


                    // パフォーマンスと座席指定した状態で券種選択へ
                    this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save((err) => {
                        this.res.redirect(this.router.build('member.reserve.tickets', {token: token}));
                    });

                });
            }
        );

    }

    /**
     * 券種選択
     */
    public tickets(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                this.processFixTickets(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.redirect(this.router.build('member.reserve.tickets', {token: token}));
                    } else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('member.reserve.profile', {token: token}));
                        });
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
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                this.processFixProfile(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.render('member/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    } else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('member.reserve.confirm', {token: token}));
                        });
                    }
                });
            } else {
                // セッションに情報があれば、フォーム初期値設定
                let email = reservationModel.purchaserEmail;
                this.res.locals.lastName = reservationModel.purchaserLastName;
                this.res.locals.firstName = reservationModel.purchaserFirstName;
                this.res.locals.tel = reservationModel.purchaserTel;
                this.res.locals.email = (email) ? email : '';
                this.res.locals.emailConfirm = (email) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (email) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod = (reservationModel.paymentMethod) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;

                this.res.render('member/reserve/profile', {
                    reservationModel: reservationModel
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
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                this.processConfirm(reservationModel, (err, reservationModel) => {
                    if (err) {
                        let message = err.message;
                        this.res.redirect(`${this.router.build('member.reserve.confirm', {token: token})}?message=${encodeURIComponent(message)}`);
                    } else {
                        reservationModel.save((err) => {
                            this.logger.info('starting GMO payment...');
                            this.res.redirect(307, this.router.build('gmo.reserve.start', {token: token}));
                        });
                    }
                });
            } else {
                this.res.render('member/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }

    /**
     * 予約完了
     */
    public complete(): void {
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                status: ReservationUtil.STATUS_RESERVED,
                member: this.req.memberUser.get('_id')
            },
            (err, reservationDocuments) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservationDocuments.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                // TODO force to logout??
                // delete this.req.session[MemberUser.AUTH_SESSION_NAME];

                this.res.render('member/reserve/complete', {
                    reservationDocuments: reservationDocuments
                });

            }
        );
    }
}
