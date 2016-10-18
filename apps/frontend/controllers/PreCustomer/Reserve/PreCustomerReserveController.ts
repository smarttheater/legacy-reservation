import ReserveBaseController from '../../ReserveBaseController';
import ReserveControllerInterface from '../../ReserveControllerInterface';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import PreCustomerUser from '../../../models/User/PreCustomerUser';
import reservePerformanceForm from '../../../forms/reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/reserve/reserveSeatForm';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import ScreenUtil from '../../../../common/models/Screen/ScreenUtil';
import FilmUtil from '../../../../common/models/Film/FilmUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import lockFile = require('lockfile');
import moment = require('moment');
import conf = require('config');


export default class PreCustomerReserveController extends ReserveBaseController implements ReserveControllerInterface {
    public purchaserGroup = ReservationUtil.PURCHASER_GROUP_CUSTOMER;
    public layout = 'layouts/preCustomer/layout';

    public start(): void {
        // 期限指定
        let now = moment();
        if (now < moment(conf.get<string>('datetimes.reservation_start_pre_customers')) || moment(conf.get<string>('datetimes.reservation_end_pre_customers')) < now) {
            return this.res.render('preCustomer/reserve/outOfTerm', {layout: false});
        }

        this.processStart((err, reservationModel) => {
            if (err) this.next(new Error(this.req.__('Message.UnexpectedError')));

            if (reservationModel.performance) {
                // パフォーマンス指定で遷移してきたら座席選択へ
                reservationModel.save(() => {
                    this.res.redirect(this.router.build('pre.reserve.seats', {token: reservationModel.token}));
                });
            } else {
                // パフォーマンス指定なければパフォーマンス選択へ
                reservationModel.save(() => {
                    this.res.redirect(this.router.build('pre.reserve.performances', {token: reservationModel.token}));
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
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            // 仮予約あればキャンセルする
            this.processCancelSeats(reservationModel, (err, reservationModel) => {
                reservationModel.save(() => {

                    // 1.5次販売アカウントによる予約数を取得
                    // 決済中ステータスは含めない
                    Models.Reservation.count(
                        {
                            $and: [
                                {pre_customer: this.req.preCustomerUser.get('_id')},
                                {
                                    $or: [
                                        {status: {$in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_RESERVED]}},
                                        {
                                            status: ReservationUtil.STATUS_WAITING_SETTLEMENT, // コンビニ決済で入金待ちのもの
                                            gmo_payment_term: {$exists: true}
                                        },
                                    ]
                                }
                            ]
                        },
                        (err, reservationsCount) => {
                            let reservableCount = parseInt(this.req.preCustomerUser.get('max_reservation_count')) - reservationsCount;

                            if (reservableCount <= 0) {
                                return this.next(new Error(this.req.__('Message.NoMoreReservation')));
                            }

                            if (this.req.method === 'POST') {
                                reservePerformanceForm(this.req, this.res, (err) => {
                                    if (this.req.form.isValid) {
                                        // パフォーマンスFIX
                                        this.processFixPerformance(reservationModel, this.req.form['performanceId'], (err, reservationModel) => {
                                            if (err) {
                                                this.next(new Error(this.req.__('Message.UnexpectedError')));
                                            } else {
                                                reservationModel.save(() => {
                                                    this.res.redirect(this.router.build('pre.reserve.seats', {token: token}));
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
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            // 1.5次販売アカウントによる予約数を取得
            // 決済中ステータスは含めない
            let lockPath = `${__dirname}/../../../../../lock/PreCustomerFixSeats${this.req.preCustomerUser.get('_id')}.lock`;
            lockFile.lock(lockPath, {wait: 5000}, (err) => {

                Models.Reservation.count(
                    {
                        $and: [
                            {pre_customer: this.req.preCustomerUser.get('_id')},
                            {
                                $or: [
                                    {status: {$in: [ReservationUtil.STATUS_TEMPORARY, ReservationUtil.STATUS_RESERVED]}},
                                    {
                                        status: ReservationUtil.STATUS_WAITING_SETTLEMENT, // コンビニ決済で入金待ちのもの
                                        gmo_payment_term: {$exists: true}
                                    },
                                ]
                            },
                            {
                                $or: [
                                    {performance: {$ne: reservationModel.performance._id}}, // パフォーマンスの違うもの
                                    { // 現在のフロー中の予約は除く
                                        performance: reservationModel.performance._id,
                                        seat_code: {$nin: reservationModel.seatCodes}
                                    }
                                ]
                            }
                        ]
                    },
                    (err, reservationsCount) => {
                        // 一度に確保できる座席数は、残り可能枚数と、10の小さい方
                        let reservableCount = parseInt(this.req.preCustomerUser.get('max_reservation_count')) - reservationsCount;
                        let limit = Math.min(reservationModel.getSeatsLimit(), reservableCount);

                        // すでに枚数制限に達している場合
                        if (limit <= 0) {
                            lockFile.unlock(lockPath, (err) => {
                                this.next(new Error(this.req.__('Message.seatsLimit{{limit}}', {limit: limit.toString()})));
                            });

                        } else {

                            if (this.req.method === 'POST') {
                                reserveSeatForm(this.req, this.res, (err) => {
                                    if (this.req.form.isValid) {
                                        let seatCodes: Array<string> = JSON.parse(this.req.form['seatCodes']);

                                        // 追加指定席を合わせて制限枚数を超過した場合
                                        if (seatCodes.length > limit) {

                                            lockFile.unlock(lockPath, (err) => {
                                                let message = this.req.__('Message.seatsLimit{{limit}}', {limit: limit.toString()});
                                                this.res.redirect(`${this.router.build('pre.reserve.seats', {token: token})}?message=${encodeURIComponent(message)}`);

                                            });

                                        } else {
                                            // 仮予約あればキャンセルする
                                            this.processCancelSeats(reservationModel, (err, reservationModel) => {
                                                // 座席FIX
                                                this.processFixSeats(reservationModel, seatCodes, (err, reservationModel) => {
                                                    lockFile.unlock(lockPath, () => {

                                                        if (err) {
                                                            reservationModel.save(() => {
                                                                let message = this.req.__('Message.SelectedSeatsUnavailable');
                                                                this.res.redirect(`${this.router.build('pre.reserve.seats', {token: token})}?message=${encodeURIComponent(message)}`);
                                                            });
                                                        } else {
                                                            reservationModel.save(() => {
                                                                // 券種選択へ
                                                                this.res.redirect(this.router.build('pre.reserve.tickets', {token: token}));
                                                            });
                                                        }

                                                    });

                                                });
                                            });

                                        }

                                    } else {
                                        lockFile.unlock(lockPath, (err) => {
                                            this.res.redirect(this.router.build('pre.reserve.seats', {token: token}));

                                        });

                                    }

                                });
                            } else {

                                lockFile.unlock(lockPath, (err) => {
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
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            reservationModel.paymentMethod = null;

            if (this.req.method === 'POST') {
                this.processFixTickets(reservationModel, (err, reservationModel) => {
                    if (err) {
                        this.res.redirect(this.router.build('pre.reserve.tickets', {token: token}));
                    } else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('pre.reserve.profile', {token: token}));
                        });
                    }
                });
            } else {
                this.res.render('preCustomer/reserve/tickets', {
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
                        this.res.render('preCustomer/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    } else {
                        reservationModel.save(() => {
                            this.res.redirect(this.router.build('pre.reserve.confirm', {token: token}));
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

                this.res.render('preCustomer/reserve/profile', {
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
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                this.processConfirm(reservationModel, (err, reservationModel) => {
                    if (err) {
                        reservationModel.remove(() => {
                            this.next(err);
                        });
                    } else {
                        reservationModel.save(() => {
                            this.logger.info('starting GMO payment...');
                            this.res.redirect(307, this.router.build('gmo.reserve.start', {token: token}) + `?locale=${this.req.getLocale()}`);
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
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                purchaser_group: this.purchaserGroup,
                status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
                purchased_at: { // 購入確定から30分有効
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
        let paymentNo = this.req.params.paymentNo;
        Models.Reservation.find(
            {
                payment_no: paymentNo,
                status: ReservationUtil.STATUS_RESERVED,
                purchased_at: { // 購入確定から30分有効
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
