import { Models } from '@motionpicture/ttts-domain';
import { ScreenUtil } from '@motionpicture/ttts-domain';
import { FilmUtil } from '@motionpicture/ttts-domain';
import { ReservationUtil } from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/Reserve/ReservationModel';
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
    public purchaserGroup = ReservationUtil.PURCHASER_GROUP_STAFF;
    public layout = 'layouts/staff/layout';

    public start(): void {
        // 期限指定
        if (moment() < moment(conf.get<string>('datetimes.reservation_start_staffs'))) {
            return this.next(new Error(this.req.__('Message.OutOfTerm')));
        }

        this.processStart((err, reservationModel) => {
            if (err) this.next(new Error(this.req.__('Message.UnexpectedError')));

            if (reservationModel.performance) {
                reservationModel.save(() => {
                    const cb = this.router.build('staff.reserve.seats', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('staff.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            } else {
                reservationModel.save(() => {
                    const cb = this.router.build('staff.reserve.performances', { token: reservationModel.token });
                    this.res.redirect(`${this.router.build('staff.reserve.terms', { token: reservationModel.token })}?cb=${encodeURIComponent(cb)}`);
                });
            }
        });
    }

    /**
     * 規約(スキップ)
     */
    public terms(): void {
        const cb = (this.req.query.cb) ? this.req.query.cb : '/';
        this.res.redirect(cb);
    }

    /**
     * 予約フロー中の座席をキャンセルするプロセス
     *
     * @override
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected processCancelSeats(reservationModel: ReservationModel, cb: (err: Error | null, reservationModel: ReservationModel) => void) {
        const seatCodesInSession = (reservationModel.seatCodes) ? reservationModel.seatCodes : [];
        if (seatCodesInSession.length === 0) return cb(null, reservationModel);

        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];

        // 仮予約をTTTS確保ステータスに戻す
        Models.Reservation.update(
            {
                performance: reservationModel.performance._id,
                seat_code: { $in: seatCodesInSession },
                status: ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TTTS
            },
            {
                $set: {
                    status: ReservationUtil.STATUS_KEPT_BY_TTTS
                },
                $unset: {
                    staff: ''
                }
            },
            {
                multi: true
            },
            () => {
                // 失敗したとしても時間経過で消えるので放置

                // 仮予約を空席ステータスに戻す
                Models.Reservation.remove(
                    {
                        performance: reservationModel.performance._id,
                        seat_code: { $in: seatCodesInSession },
                        status: ReservationUtil.STATUS_TEMPORARY
                    },
                    () => {
                        // 失敗したとしても時間経過で消えるので放置

                        cb(null, reservationModel);
                    }
                );
            }
        );
    }

    /**
     * 座席をFIXするプロセス
     *
     * @override
     */
    // tslint:disable-next-line:max-func-body-length
    protected processFixSeats(reservationModel: ReservationModel, seatCodes: string[], cb: (err: Error | null, reservationModel: ReservationModel) => void) {
        if (!this.req.staffUser) return cb(new Error(this.req.__('Message.UnexpectedError')), reservationModel);
        const staffUser = this.req.staffUser;

        // セッション中の予約リストを初期化
        reservationModel.seatCodes = [];
        reservationModel.expiredAt = moment().add(conf.get<number>('temporary_reservation_valid_period_seconds'), 'seconds').valueOf();

        // 新たな座席指定と、既に仮予約済みの座席コードについて
        const promises = seatCodes.map((seatCode) => {
            return new Promise((resolve, reject) => {
                const seatInfo = reservationModel.performance.screen.sections[0].seats.find((seat) => {
                    return (seat.code === seatCode);
                });

                // 万が一、座席が存在しなかったら
                if (!seatInfo) return reject(new Error(this.req.__('Message.InvalidSeatCode')));

                // 予約データを作成(同時作成しようとしたり、既に予約があったとしても、unique indexではじかれる)
                Models.Reservation.create(
                    {
                        performance: reservationModel.performance._id,
                        seat_code: seatCode,
                        status: ReservationUtil.STATUS_TEMPORARY,
                        expired_at: reservationModel.expiredAt,
                        staff: staffUser.get('_id')
                    },
                    (err: any, reservation: mongoose.Document) => {
                        if (err) {
                            // TTTS確保からの仮予約を試みる
                            Models.Reservation.findOneAndUpdate(
                                {
                                    performance: reservationModel.performance._id,
                                    seat_code: seatCode,
                                    status: ReservationUtil.STATUS_KEPT_BY_TTTS
                                },
                                {
                                    status: ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TTTS,
                                    expired_at: reservationModel.expiredAt,
                                    staff: staffUser.get('_id')
                                },
                                {
                                    new: true
                                },
                                // tslint:disable-next-line:no-shadowed-variable
                                (findReservationErr, reservation) => {
                                    if (findReservationErr) return reject(findReservationErr);
                                    if (!reservation) return reject(new Error(this.req.__('Message.UnexpectedError')));

                                    // ステータス更新に成功したらセッションに保管
                                    reservationModel.seatCodes.push(seatCode);
                                    reservationModel.setReservation(seatCode, {
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

                                    resolve();
                                }
                            );
                        } else {
                            // ステータス更新に成功したらセッションに保管
                            reservationModel.seatCodes.push(seatCode);
                            reservationModel.setReservation(seatCode, {
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

                            resolve();
                        }
                    }
                );
            });
        });

        Promise.all(promises).then(
            () => {
                // 座席コードのソート(文字列順に)
                reservationModel.seatCodes.sort(ScreenUtil.sortBySeatCode);

                cb(null, reservationModel);
            },
            (err) => {
                cb(err, reservationModel);
            }
        );
    }

    /**
     * スケジュール選択
     */
    public performances(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || !reservationModel) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                reservePerformanceForm(this.req, this.res, () => {
                    if (this.req.form && this.req.form.isValid) {
                        // パフォーマンスFIX
                        const performanceId = (<any>this.req.form).performanceId;
                        // tslint:disable-next-line:no-shadowed-variable
                        this.processFixPerformance(reservationModel, performanceId, (fixPerformanceErr, reservationModel) => {
                            if (fixPerformanceErr) {
                                this.next(fixPerformanceErr);
                            } else {
                                reservationModel.save(() => {
                                    this.res.redirect(this.router.build('staff.reserve.seats', { token: token }));
                                });
                            }
                        });

                    } else {
                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                    }
                });
            } else {
                // 仮予約あればキャンセルする
                // tslint:disable-next-line:no-shadowed-variable
                this.processCancelSeats(reservationModel, (cancelSeatsErr, reservationModel) => {
                    if (cancelSeatsErr) return this.next(cancelSeatsErr);

                    reservationModel.save(() => {
                        this.res.render('staff/reserve/performances', {
                            FilmUtil: FilmUtil
                        });
                    });
                });
            }
        });
    }

    /**
     * 座席選択
     */
    public seats(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || !reservationModel) return this.next(new Error(this.req.__('Message.Expired')));

            const limit = reservationModel.getSeatsLimit();

            if (this.req.method === 'POST') {
                reserveSeatForm(this.req, this.res, () => {
                    if (this.req.form && this.req.form.isValid) {

                        const seatCodes: string[] = JSON.parse((<any>this.req.form).seatCodes);

                        // 追加指定席を合わせて制限枚数を超過した場合
                        if (seatCodes.length > limit) {
                            const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                            this.res.redirect(`${this.router.build('staff.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);

                        } else {
                            // 仮予約あればキャンセルする
                            // tslint:disable-next-line:no-shadowed-variable
                            this.processCancelSeats(reservationModel, (cancelSeatsErr, reservationModel) => {
                                if (cancelSeatsErr) return this.next(cancelSeatsErr);

                                // 座席FIX
                                // tslint:disable-next-line:no-shadowed-variable
                                this.processFixSeats(reservationModel, seatCodes, (fixSeatsErr, reservationModel) => {
                                    if (fixSeatsErr) {
                                        reservationModel.save(() => {
                                            const message = this.req.__('Message.SelectedSeatsUnavailable');
                                            this.res.redirect(`${this.router.build('staff.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                        });
                                    } else {
                                        reservationModel.save(() => {
                                            // 券種選択へ
                                            this.res.redirect(this.router.build('staff.reserve.tickets', { token: token }));
                                        });
                                    }
                                });
                            });
                        }
                    } else {
                        this.res.redirect(this.router.build('staff.reserve.seats', { token: token }));
                    }
                });
            } else {
                this.res.render('staff/reserve/seats', {
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
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || !reservationModel) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixTickets(reservationModel, (fixTicketsErr, reservationModel) => {
                    if (fixTicketsErr) {
                        this.res.redirect(this.router.build('staff.reserve.tickets', { token: token }));
                    } else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('staff.reserve.profile', { token: token }));
                        });
                    }
                });
            } else {
                this.res.render('staff/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        });
    }

    /**
     * 購入者情報(スキップ)
     */
    public profile(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            this.res.redirect(this.router.build('staff.reserve.confirm', { token: token }));
        });
    }

    /**
     * 予約内容確認
     */
    public confirm(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || !reservationModel) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processConfirm(reservationModel, (processConfirmErr, reservationModel) => {
                    if (processConfirmErr) {
                        reservationModel.remove(() => {
                            this.next(processConfirmErr);
                        });
                    } else {
                        // 予約確定
                        this.processFixReservations(reservationModel.paymentNo, {}, (fixReservationsErr) => {
                            if (fixReservationsErr) {
                                const message = fixReservationsErr.message;
                                this.res.redirect(`${this.router.build('staff.reserve.confirm', { token: token })}?message=${encodeURIComponent(message)}`);
                            } else {
                                reservationModel.remove(() => {
                                    this.logger.info('redirecting to complete...');
                                    this.res.redirect(this.router.build('staff.reserve.complete', { paymentNo: reservationModel.paymentNo }));
                                });
                            }
                        });
                    }
                });
            } else {
                this.res.render('staff/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }

    public complete(): void {
        if (!this.req.staffUser) return this.next(new Error(this.req.__('Message.UnexpectedError')));

        const paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                status: ReservationUtil.STATUS_RESERVED,
                staff: this.req.staffUser.get('_id'),
                purchased_at: { // 購入確定から30分有効
                    // tslint:disable-next-line:no-magic-numbers
                    $gt: moment().add(-30, 'minutes').toISOString()
                }
            },
            (err, reservations) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservations.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                reservations.sort((a, b) => {
                    return ScreenUtil.sortBySeatCode(a.get('seat_code'), b.get('seat_code'));
                });

                this.res.render('staff/reserve/complete', {
                    reservationDocuments: reservations
                });
            }
        );
    }
}
