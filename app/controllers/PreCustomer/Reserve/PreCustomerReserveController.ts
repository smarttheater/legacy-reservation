import { Models } from '@motionpicture/ttts-domain';
import { ScreenUtil } from '@motionpicture/ttts-domain';
import { FilmUtil } from '@motionpicture/ttts-domain';
import { ReservationUtil } from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as lockFile from 'lockfile';
import * as moment from 'moment';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';

const DEFAULT_RADIX = 10;

export default class PreCustomerReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup = ReservationUtil.PURCHASER_GROUP_CUSTOMER;
    public layout = 'layouts/preCustomer/layout';

    public start(): void {
        // MPのIPは許可
        // tslint:disable-next-line:no-empty
        if (this.req.headers['x-forwarded-for'] && /^124\.155\.113\.9$/.test(this.req.headers['x-forwarded-for'])) {
        } else {
            // 期限指定
            const now = moment();
            if (now < moment(conf.get<string>('datetimes.reservation_start_pre_customers')) || moment(conf.get<string>('datetimes.reservation_end_pre_customers')) < now) {
                return this.res.render('preCustomer/reserve/outOfTerm', { layout: false });
            }
        }

        this.processStart((err, reservationModel) => {
            if (err) this.next(new Error(this.req.__('Message.UnexpectedError')));

            if (reservationModel.performance) {
                // パフォーマンス指定で遷移してきたら座席選択へ
                reservationModel.save(() => {
                    this.res.redirect(this.router.build('pre.reserve.seats', { token: reservationModel.token }));
                });
            } else {
                // パフォーマンス指定なければパフォーマンス選択へ
                reservationModel.save(() => {
                    this.res.redirect(this.router.build('pre.reserve.performances', { token: reservationModel.token }));
                });
            }
        });
    }

    /**
     * 規約
     */
    public terms(): void {
        this.next(new Error('Message.NotFound'));
    }

    /**
     * スケジュール選択
     */
    public performances(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            // 仮予約あればキャンセルする
            // tslint:disable-next-line:no-shadowed-variable
            this.processCancelSeats(reservationModel, (cancelSeatsErr, reservationModel) => {
                reservationModel.save(() => {

                    // 1.5次販売アカウントによる予約数を取得
                    // 決済中ステータスは含めない
                    Models.Reservation.count(
                        {
                            $and: [
                                { pre_customer: this.req.preCustomerUser.get('_id') },
                                {
                                    $or: [
                                        { status: { $in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_RESERVED] } },
                                        {
                                            status: ReservationUtil.STATUS_WAITING_SETTLEMENT, // コンビニ決済で入金待ちのもの
                                            gmo_payment_term: { $exists: true }
                                        }
                                    ]
                                }
                            ]
                        },
                        (countReservationErr, reservationsCount) => {
                            const reservableCount = parseInt(this.req.preCustomerUser.get('max_reservation_count'), DEFAULT_RADIX) - reservationsCount;

                            if (reservableCount <= 0) {
                                return this.next(new Error(this.req.__('Message.NoMoreReservation')));
                            }

                            if (this.req.method === 'POST') {
                                reservePerformanceForm(this.req, this.res, () => {
                                    if (this.req.form.isValid) {
                                        // パフォーマンスFIX
                                        const performanceId = (<any>this.req.form).performanceId;
                                        // tslint:disable-next-line:no-shadowed-variable
                                        this.processFixPerformance(reservationModel, performanceId, (fixPerformancesErr, reservationModel) => {
                                            if (fixPerformancesErr) {
                                                this.next(new Error(this.req.__('Message.UnexpectedError')));
                                            } else {
                                                reservationModel.save(() => {
                                                    this.res.redirect(this.router.build('pre.reserve.seats', { token: token }));
                                                });
                                            }
                                        });
                                    } else {
                                        this.next(new Error(this.req.__('Message.UnexpectedError')));
                                    }
                                });
                            } else {
                                this.res.render('preCustomer/reserve/performances', {
                                    FilmUtil: FilmUtil,
                                    reservableCount: reservableCount
                                });
                            }
                        }
                    );
                });
            });
        });
    }

    /**
     * 座席選択
     */
    public seats(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            // 1.5次販売アカウントによる予約数を取得
            // 決済中ステータスは含めない
            const lockPath = `${__dirname}/../../../../../lock/PreCustomerFixSeats${this.req.preCustomerUser.get('_id')}.lock`;
            // tslint:disable-next-line:max-func-body-length
            lockFile.lock(lockPath, { wait: 5000 }, (lockErr) => {

                Models.Reservation.count(
                    {
                        $and: [
                            { pre_customer: this.req.preCustomerUser.get('_id') },
                            {
                                $or: [
                                    { status: { $in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_RESERVED] } },
                                    {
                                        status: ReservationUtil.STATUS_WAITING_SETTLEMENT, // コンビニ決済で入金待ちのもの
                                        gmo_payment_term: { $exists: true }
                                    }
                                ]
                            },
                            {
                                $or: [
                                    { performance: { $ne: reservationModel.performance._id } }, // パフォーマンスの違うもの
                                    { // 現在のフロー中の予約は除く
                                        performance: reservationModel.performance._id,
                                        seat_code: { $nin: reservationModel.seatCodes }
                                    }
                                ]
                            }
                        ]
                    },
                    (countReservationErr, reservationsCount) => {
                        // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
                        const reservableCount = parseInt(this.req.preCustomerUser.get('max_reservation_count'), DEFAULT_RADIX) - reservationsCount;
                        const limit = Math.min(reservationModel.getSeatsLimit(), reservableCount);

                        // すでに枚数制限に達している場合
                        if (limit <= 0) {
                            lockFile.unlock(lockPath, (unlockErr) => {
                                this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() })));
                            });

                        } else {

                            if (this.req.method === 'POST') {
                                reserveSeatForm(this.req, this.res, () => {
                                    if (this.req.form.isValid) {
                                        const seatCodes: string[] = JSON.parse((<any>this.req.form).seatCodes);

                                        // 追加指定席を合わせて制限枚数を超過した場合
                                        if (seatCodes.length > limit) {

                                            lockFile.unlock(lockPath, (unlockErr) => {
                                                const message = this.req.__('Message.seatsLimit{{limit}}', { limit: limit.toString() });
                                                this.res.redirect(`${this.router.build('pre.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);

                                            });

                                        } else {
                                            // 仮予約あればキャンセルする
                                            // tslint:disable-next-line:no-shadowed-variable
                                            this.processCancelSeats(reservationModel, (cancelSeatsErr, reservationModel) => {
                                                // 座席FIX
                                                // tslint:disable-next-line:no-shadowed-variable
                                                this.processFixSeats(reservationModel, seatCodes, (fixSeatsErr, reservationModel) => {
                                                    lockFile.unlock(lockPath, () => {

                                                        if (fixSeatsErr) {
                                                            reservationModel.save(() => {
                                                                const message = this.req.__('Message.SelectedSeatsUnavailable');
                                                                this.res.redirect(`${this.router.build('pre.reserve.seats', { token: token })}?message=${encodeURIComponent(message)}`);
                                                            });
                                                        } else {
                                                            reservationModel.save(() => {
                                                                // 券種選択へ
                                                                this.res.redirect(this.router.build('pre.reserve.tickets', { token: token }));
                                                            });
                                                        }

                                                    });

                                                });
                                            });

                                        }

                                    } else {
                                        lockFile.unlock(lockPath, (unlockErr) => {
                                            this.res.redirect(this.router.build('pre.reserve.seats', { token: token }));

                                        });

                                    }

                                });
                            } else {
                                lockFile.unlock(lockPath, (unlockErr) => {
                                    this.res.render('preCustomer/reserve/seats', {
                                        reservationModel: reservationModel,
                                        limit: limit,
                                        reservableCount: reservableCount
                                    });

                                });
                            }
                        }
                    }
                );
            });
        });
    }

    /**
     * 券種選択
     */
    public tickets(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            reservationModel.paymentMethod = null;

            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixTickets(reservationModel, (fixTicketsErr, reservationModel) => {
                    if (fixTicketsErr) {
                        this.res.redirect(this.router.build('pre.reserve.tickets', { token: token }));
                    } else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('pre.reserve.profile', { token: token }));
                        });
                    }
                });
            } else {
                this.res.render('preCustomer/reserve/tickets', {
                    reservationModel: reservationModel
                });
            }
        });
    }

    /**
     * 購入者情報
     */
    public profile(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processFixProfile(reservationModel, (fixProfileErr, reservationModel) => {
                    if (fixProfileErr) {
                        this.res.render('preCustomer/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    } else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('pre.reserve.confirm', { token: token }));
                        });
                    }
                });
            } else {
                // セッションに情報があれば、フォーム初期値設定
                const email = reservationModel.purchaserEmail;
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

                this.res.render('preCustomer/reserve/profile', {
                    reservationModel: reservationModel
                });
            }
        });
    }

    /**
     * 予約内容確認
     */
    public confirm(): void {
        const token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                // tslint:disable-next-line:no-shadowed-variable
                this.processConfirm(reservationModel, (processConfirmErr, reservationModel) => {
                    if (processConfirmErr) {
                        reservationModel.remove(() => {
                            this.next(processConfirmErr);
                        });
                    } else {
                        reservationModel.save(() => {
                            this.logger.info('starting GMO payment...');
                            const STATUS_CODE_PERMANENT_REDIRECT = 308;
                            this.res.redirect(STATUS_CODE_PERMANENT_REDIRECT, this.router.build('gmo.reserve.start', { token: token }) + `?locale=${this.req.getLocale()}`);
                        });
                    }
                });
            } else {
                this.res.render('preCustomer/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    }

    /**
     * 仮予約完了
     */
    public waitingSettlement(): void {
        const paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                purchaser_group: this.purchaserGroup,
                status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
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

                this.res.render('preCustomer/reserve/waitingSettlement', {
                    reservationDocuments: reservations
                });
            }
        );
    }

    /**
     * 予約完了
     */
    public complete(): void {
        const paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                status: ReservationUtil.STATUS_RESERVED,
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

                this.res.render('preCustomer/reserve/complete', {
                    reservationDocuments: reservations
                });
            }
        );

    }
}
