import ReserveBaseController from '../../ReserveBaseController';
import MemberUser from '../../../models/User/MemberUser';
import Constants from '../../../../common/Util/Constants';
import Util from '../../../../common/Util/Util';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ScreenUtil from '../../../../common/models/Screen/ScreenUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import moment = require('moment');
import ReserveControllerInterface from '../../ReserveControllerInterface';

export default class MemberReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup = ReservationUtil.PURCHASER_GROUP_MEMBER;
    public layout = 'layouts/member/layout';

    public start(): void {
        // 予約状況を確認
        Models.Reservation.find(
            {
                member_user_id: this.req.memberUser.get('user_id'),
                purchaser_group: this.purchaserGroup,
                status: ReservationUtil.STATUS_KEPT_BY_MEMBER
            },
            'performance seat_code status',
            (err, reservations) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                this.processStart((err, reservationModel) => {
                    if (err) this.next(new Error(this.req.__('Message.UnexpectedError')));

                    if (reservationModel.performance) {
                    } else {
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
                                    seat_grade_name_ja: seatInfo.grade.name.ja,
                                    seat_grade_name_en: seatInfo.grade.name.en,
                                    seat_grade_additional_charge: seatInfo.grade.additional_charge
                                });
                            }


                            // パフォーマンスと座席指定した状態で券種選択へ
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('member.reserve.tickets', {token: reservationModel.token}));
                            });
                        });
                    }
                });
            }
        );
    }

    public terms(): void {
        this.next(new Error('Message.NotFound'));
    }

    public performances(): void {
        this.next(new Error('Message.NotFound'));
    }

    public seats(): void {
        this.next(new Error('Message.NotFound'));
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
                this.res.locals.age = reservationModel.purchaserAge;
                this.res.locals.address = reservationModel.purchaserAddress;
                this.res.locals.gender = reservationModel.purchaserGender;
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
                        reservationModel.remove(() => {
                            this.next(err);
                        });
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
            (err, reservations) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                reservations.sort((a, b) => {
                    return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });

                this.res.render('member/reserve/complete', {
                    reservationDocuments: reservations
                });
            }
        );
    }
}
