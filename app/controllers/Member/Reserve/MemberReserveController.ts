import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';
import { Util as GMOUtil } from '@motionpicture/gmo-service';
import * as httpStatus from 'http-status';
import * as moment from 'moment';
import * as _ from 'underscore';

import ReservationModel from '../../../models/reserve/session';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

/**
 * メルマガ先行会員座席予約コントローラー
 *
 * @export
 * @class MemberReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
export default class MemberReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup: string = ReservationUtil.PURCHASER_GROUP_MEMBER;
    public layout: string = 'layouts/member/layout';

    public async start(): Promise<void> {
        if (this.req.memberUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            // 予約状況を確認
            const reservations = await Models.Reservation.find(
                {
                    member_user_id: this.req.memberUser.get('user_id'),
                    purchaser_group: this.purchaserGroup,
                    status: ReservationUtil.STATUS_KEPT_BY_MEMBER
                },
                'performance seat_code status'
            ).exec();

            if (reservations.length === 0) {
                this.next(new Error(this.req.__('Message.NoAvailableSeats')));
                return;
            }

            let reservationModel = await this.processStart();

            // パフォーマンスFIX
            // tslint:disable-next-line:no-shadowed-variable
            reservationModel = await this.processFixPerformance(reservationModel, reservations[0].get('performance').toString());

            // 座席FIX
            reservations.forEach((reservation) => {
                const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                    return (seat.code === reservation.get('seat_code'));
                });
                if (seatInfo === undefined) throw new Error(this.req.__('Message.UnexpectedError'));

                reservationModel.seatCodes.push(reservation.get('seat_code'));
                reservationModel.setReservation(reservation.get('seat_code'), {
                    _id: reservation.get('_id'),
                    status: reservation.get('status'),
                    seat_code: reservation.get('seat_code'),
                    seat_grade_name_ja: seatInfo.grade.name.ja,
                    seat_grade_name_en: seatInfo.grade.name.en,
                    seat_grade_additional_charge: seatInfo.grade.additional_charge,
                    ticket_type_code: '',
                    ticket_type_name_ja: '',
                    ticket_type_name_en: '',
                    ticket_type_charge: 0,
                    watcher_name: ''
                });
            });

            // パフォーマンスと座席指定した状態で券種選択へ
            await reservationModel.save();
            this.res.redirect(`/member/reserve/${reservationModel.token}/tickets`);
        } catch (error) {
            console.error(error);
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
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
    public async tickets(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processFixTickets(reservationModel);
                    await reservationModel.save();
                    this.res.redirect(`/member/reserve/${token}/profile`);
                } catch (error) {
                    this.res.redirect(`/member/reserve/${token}/tickets`);
                }
            } else {
                this.res.render('member/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 購入者情報
     */
    public async profile(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    reservationModel = await this.processFixProfile(reservationModel);
                    await reservationModel.save();
                    this.res.redirect(`/member/reserve/${token}/confirm`);
                } catch (error) {
                    this.res.render('member/reserve/profile', {
                        reservationModel: reservationModel
                    });
                }
            } else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.purchaserEmail;
                this.res.locals.lastName = reservationModel.purchaserLastName;
                this.res.locals.firstName = reservationModel.purchaserFirstName;
                this.res.locals.tel = reservationModel.purchaserTel;
                this.res.locals.age = reservationModel.purchaserAge;
                this.res.locals.address = reservationModel.purchaserAddress;
                this.res.locals.gender = reservationModel.purchaserGender;
                this.res.locals.email = (!_.isEmpty(email)) ? email : '';
                this.res.locals.emailConfirm = (!_.isEmpty(email)) ? email.substr(0, email.indexOf('@')) : '';
                this.res.locals.emailConfirmDomain = (!_.isEmpty(email)) ? email.substr(email.indexOf('@') + 1) : '';
                this.res.locals.paymentMethod =
                    (!_.isEmpty(reservationModel.paymentMethod)) ? reservationModel.paymentMethod : GMOUtil.PAY_TYPE_CREDIT;

                this.res.render('member/reserve/profile', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約内容確認
     */
    public async confirm(): Promise<void> {
        try {
            const token = this.req.params.token;
            const reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                try {
                    await this.processConfirm(reservationModel);
                    await reservationModel.save();
                    this.logger.info('starting GMO payment...');
                    this.res.redirect((<any>httpStatus).PERMANENT_REDIRECT, `/GMO/reserve/${token}/start?locale=${this.req.getLocale()}`);
                } catch (error) {
                    await reservationModel.remove();
                    this.next(error);
                }
            } else {
                this.res.render('member/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約完了
     */
    public async complete(): Promise<void> {
        try {
            const paymentNo = this.req.params.paymentNo;
            const reservations = await Models.Reservation.find(
                {
                    payment_no: paymentNo,
                    status: ReservationUtil.STATUS_RESERVED,
                    purchased_at: { // 購入確定から30分有効
                        // tslint:disable-next-line:no-magic-numbers
                        $gt: moment().add(-30, 'minutes').toISOString()
                    }
                }
            ).exec();

            if (reservations.length === 0) {
                this.next(new Error(this.req.__('Message.NotFound')));
                return;
            }

            reservations.sort((a, b) => {
                return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
            });

            this.res.render('member/reserve/complete', {
                reservationDocuments: reservations
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }
}
