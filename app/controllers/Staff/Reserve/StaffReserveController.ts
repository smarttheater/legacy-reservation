import { FilmUtil, Models, ReservationUtil, ScreenUtil } from '@motionpicture/chevre-domain';
import * as conf from 'config';
import * as moment from 'moment';
import * as _ from 'underscore';

import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/reserve/session';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

/**
 * 内部関係者座席予約コントローラー
 *
 * @export
 * @class StaffReserveController
 * @extends {ReserveBaseController}
 * @implements {ReserveControllerInterface}
 */
export default class StaffReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup: string = ReservationUtil.PURCHASER_GROUP_STAFF;
    public layout: string = 'layouts/staff/layout';

    public async start(): Promise<void> {
        // 期限指定
        if (moment() < moment(conf.get<string>('datetimes.reservation_start_staffs'))) {
            this.next(new Error(this.req.__('Message.OutOfTerm')));
            return;
        }

        try {
            const reservationModel = await this.processStart();
            await reservationModel.save();

            if (reservationModel.performance !== undefined) {
                const cb = `/staff/reserve/${reservationModel.token}/seats`;
                this.res.redirect(`/staff/reserve/${reservationModel.token}/terms?cb=${encodeURIComponent(cb)}`);
            } else {
                const cb = `/staff/reserve/${reservationModel.token}/performances`;
                this.res.redirect(`/staff/reserve/${reservationModel.token}/terms?cb=${encodeURIComponent(cb)}`);
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 規約(スキップ)
     */
    public terms(): void {
        const cb = (!_.isEmpty(this.req.query.cb)) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }

    /**
     * スケジュール選択
     * @method performances
     * @returns {Promise<void>}
     */
    public async performances(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            if (this.req.method === 'POST') {
                reservePerformanceForm(this.req);
                const validationResult = await this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
                try {
                    // パフォーマンスFIX
                    reservationModel = await this.processFixPerformance(
                        <ReservationModel>reservationModel,
                        this.req.body.performanceId
                    );
                    await reservationModel.save();
                    this.res.redirect(`/staff/reserve/${token}/seats`);
                    return;
                } catch (error) {
                    this.next(new Error(this.req.__('Message.UnexpectedError')));
                    return;
                }
            } else {
                // 仮予約あればキャンセルする
                reservationModel = await this.processCancelSeats(<ReservationModel>reservationModel);
                await reservationModel.save();

                this.res.render('staff/reserve/performances', {
                    FilmUtil: FilmUtil,
                    layout: this.layout
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 座席選択
     */
    public async seats(): Promise<void> {
        try {
            const token = this.req.params.token;
            let reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            const limit = reservationModel.getSeatsLimit();

            if (this.req.method === 'POST') {
                reserveSeatForm(this.req);
                const validationResult = await this.req.getValidationResult();
                if (!validationResult.isEmpty()) {
                    this.res.redirect(`/staff/reserve/${token}/seats`);
                    return;
                }
                reservationModel = <ReservationModel>reservationModel;
                const seatCodes: string[] = JSON.parse(this.req.body.seatCodes);

                // 追加指定席を合わせて制限枚数を超過した場合
                if (seatCodes.length > limit) {
                    const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                    this.res.redirect(`/staff/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
                    return;
                }

                // 仮予約あればキャンセルする
                try {
                    reservationModel = await this.processCancelSeats(reservationModel);
                } catch (error) {
                    this.next(error);
                    return;
                }

                try {
                    // 座席FIX
                    reservationModel = await this.processFixSeats(reservationModel, seatCodes);
                    await reservationModel.save();
                    // 券種選択へ
                    this.res.redirect(`/staff/reserve/${token}/tickets`);
                    return;
                } catch (error) {
                    await reservationModel.save();
                    const message = this.req.__('Message.SelectedSeatsUnavailable');
                    this.res.redirect(`/staff/reserve/${token}/seats?message=${encodeURIComponent(message)}`);
                    return;
                }
            } else {
                this.res.render('staff/reserve/seats', {
                    reservationModel: reservationModel,
                    limit: limit,
                    layout: this.layout
                });
                return;
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

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
                    this.res.redirect(`/staff/reserve/${token}/profile`);
                } catch (error) {
                    this.res.redirect(`/staff/reserve/${token}/tickets`);
                }
            } else {
                this.res.render('staff/reserve/tickets', {
                    reservationModel: reservationModel,
                    layout: this.layout
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 購入者情報(スキップ)
     */
    public async profile(): Promise<void> {
        try {
            const token = this.req.params.token;
            const reservationModel = await ReservationModel.find(token);

            if (reservationModel === null) {
                this.next(new Error(this.req.__('Message.Expired')));
                return;
            }

            await this.processAllExceptConfirm(reservationModel);
            this.res.redirect(`/staff/reserve/${token}/confirm`);
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

                    // 予約確定
                    await this.processFixReservations(reservationModel.performance.day, reservationModel.paymentNo, {});
                    await reservationModel.remove();
                    this.res.redirect(`/staff/reserve/${reservationModel.performance.day}/${reservationModel.paymentNo}/complete`);
                } catch (error) {
                    await reservationModel.remove();
                    this.next(error);
                }
            } else {
                this.res.render('staff/reserve/confirm', {
                    reservationModel: reservationModel,
                    layout: this.layout
                });
            }
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    public async complete(): Promise<void> {
        if (this.req.staffUser === undefined) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
            return;
        }

        try {
            const reservations = await Models.Reservation.find(
                {
                    performance_day: this.req.params.performanceDay,
                    payment_no: this.req.params.paymentNo,
                    status: ReservationUtil.STATUS_RESERVED,
                    staff: this.req.staffUser.get('_id'),
                    purchased_at: { // 購入確定から30分有効
                        $gt: moment().add(-30, 'minutes').toISOString() // tslint:disable-line:no-magic-numbers
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

            this.res.render('staff/reserve/complete', {
                reservationDocuments: reservations,
                layout: this.layout
            });
        } catch (error) {
            this.next(new Error(this.req.__('Message.UnexpectedError')));
        }
    }

    /**
     * 予約フロー中の座席をキャンセルするプロセス
     *
     * @override
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected async processCancelSeats(reservationModel: ReservationModel): Promise<ReservationModel> {
        const seatCodesInSession = (reservationModel.seatCodes !== undefined) ? reservationModel.seatCodes : [];
        if (seatCodesInSession.length === 0) {
            return reservationModel;
        }

        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];

        // 仮予約をCHEVRE確保ステータスに戻す
        try {
            await Models.Reservation.update(
                {
                    performance: reservationModel.performance._id,
                    seat_code: { $in: seatCodesInSession },
                    status: ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE
                },
                {
                    $set: {
                        status: ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    },
                    $unset: {
                        staff: ''
                    }
                },
                {
                    multi: true
                }
            ).exec();

            // 仮予約を空席ステータスに戻す
            await Models.Reservation.remove(
                {
                    performance: reservationModel.performance._id,
                    seat_code: { $in: seatCodesInSession },
                    status: ReservationUtil.STATUS_TEMPORARY
                }
            ).exec();
        } catch (error) {
            // 失敗したとしても時間経過で消えるので放置
        }

        return reservationModel;
    }

    /**
     * 座席をFIXするプロセス
     *
     * @override
     */
    protected async processFixSeats(reservationModel: ReservationModel, seatCodes: string[]): Promise<ReservationModel> {
        if (this.req.staffUser === undefined) {
            throw new Error(this.req.__('Message.UnexpectedError'));
        }

        const staffUser = this.req.staffUser;

        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        reservationModel.expiredAt = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();

        // 新たな座席指定と、既に仮予約済みの座席コードについて
        const promises = seatCodes.map(async (seatCode) => {
            const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                return (seat.code === seatCode);
            });

            // 万が一、座席が存在しなかったら
            if (seatInfo === undefined) {
                throw new Error(this.req.__('Message.InvalidSeatCode'));
            }

            // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
            try {
                const reservation = await Models.Reservation.create(
                    {
                        performance: reservationModel.performance._id,
                        seat_code: seatCode,
                        status: ReservationUtil.STATUS_TEMPORARY,
                        expired_at: reservationModel.expiredAt,
                        staff: staffUser.get('_id')
                    }
                );

                // ステータス更新に成功したらセッションに保管
                reservationModel.seatCodes.push(seatCode);
                reservationModel.setReservation(seatCode, {
                    _id: reservation.get('_id'),
                    status: reservation.get('status'),
                    seat_code: reservation.get('seat_code'),
                    seat_grade_name: seatInfo.grade.name,
                    seat_grade_additional_charge: seatInfo.grade.additional_charge,
                    ticket_type: '',
                    ticket_type_name: {
                        ja: '',
                        en: ''
                    },
                    ticket_type_charge: 0,
                    watcher_name: ''
                });
            } catch (error) {
                // CHEVRE確保からの仮予約を試みる
                const reservation = await Models.Reservation.findOneAndUpdate(
                    {
                        performance: reservationModel.performance._id,
                        seat_code: seatCode,
                        status: ReservationUtil.STATUS_KEPT_BY_CHEVRE
                    },
                    {
                        status: ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE,
                        expired_at: reservationModel.expiredAt,
                        staff: staffUser.get('_id')
                    },
                    {
                        new: true
                    }
                ).exec();

                if (reservation === null) {
                    throw new Error(this.req.__('Message.UnexpectedError'));
                }

                // ステータス更新に成功したらセッションに保管
                reservationModel.seatCodes.push(seatCode);
                reservationModel.setReservation(seatCode, {
                    _id: reservation.get('_id'),
                    status: reservation.get('status'),
                    seat_code: reservation.get('seat_code'),
                    seat_grade_name: seatInfo.grade.name,
                    seat_grade_additional_charge: seatInfo.grade.additional_charge,
                    ticket_type: '',
                    ticket_type_name: {
                        ja: '',
                        en: ''
                    },
                    ticket_type_charge: 0,
                    watcher_name: ''
                });
            }
        });

        await Promise.all(promises);
        // 座席コードのソート(文字列順に)
        reservationModel.seatCodes.sort(ScreenUtil.sortBySeatCode);

        return reservationModel;
    }
}
