import ReserveBaseController from '../../ReserveBaseController';
import Util from '../../../../common/Util/Util';
import GMOUtil from '../../../../common/Util/GMO/GMOUtil';
import reservePerformanceForm from '../../../forms/Reserve/reservePerformanceForm';
import reserveSeatForm from '../../../forms/Reserve/reserveSeatForm';
import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import FilmUtil from '../../../../common/models/Film/FilmUtil';
import ReservationModel from '../../../models/Reserve/ReservationModel';
import lockFile = require('lockfile');

export default class CustomerReserveController extends ReserveBaseController {
    public static RESERVATION_LIMIT_PER_PERFORMANCE = 4; // パフォーマンスあたりの最大座席確保枚数

    /**
     * スケジュール選択(本番では存在しない、実際はポータル側のページ)
     */
    public performances(): void {
        if (this.req.method === 'POST') {
            reservePerformanceForm(this.req, this.res, (err) => {
                if (this.req.form.isValid) {
                    this.res.redirect(this.router.build('customer.reserve.start') + `?performance=${this.req.form['performanceId']}`);
                } else {
                    this.res.render('customer/reserve/performances');
                }
            });
        } else {
            this.res.render('customer/reserve/performances', {
                FilmUtil: FilmUtil
            });
        }
    }

    /**
     * ポータルからパフォーマンスと言語指定で遷移してくる
     */
    public start(): void {
        this.processStart(ReservationUtil.PURCHASER_GROUP_CUSTOMER, (err, reservationModel) => {
            if (err) this.next(new Error(this.req.__('Message.UnexpectedError')));

            if (reservationModel.performance) {
                reservationModel.save((err) => {
                    this.res.redirect(this.router.build('customer.reserve.terms', {token: reservationModel.token}));
                });
            } else {
                // 今回は必ずパフォーマンス指定で遷移してくるはず
                this.next(new Error(this.req.__('Message.UnexpectedError')));
                // reservationModel.save((err) => {
                //     this.res.redirect(this.router.build('customer.reserve.performances', {token: reservationModel.token}));
                // });
            }
        });
    }

    /**
     * 規約
     */
    public terms(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            if (this.req.method === 'POST') {
                this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
            } else {
                this.res.render('customer/reserve/terms');
            }
        });
    }

    /**
     * 座席選択
     */
    public seats(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err) return this.next(new Error(this.req.__('Message.Expired')));

            // 1アカウント1パフォーマンスごとに枚数制限
            let lockPath = `${__dirname}/../../../../../lock/CustomerFixSeats${reservationModel.performance._id}.lock`;
            lockFile.lock(lockPath, {wait: 5000}, (err) => {

                Models.Reservation.count(
                    {
                        performance: reservationModel.performance._id,
                        seat_code: {
                            $nin: reservationModel.seatCodes // 現在のフロー中の予約は除く
                        },
                        status: 'dummy'
                    },
                    (err, reservationsCount) => {
                        let limit = CustomerReserveController.RESERVATION_LIMIT_PER_PERFORMANCE - reservationsCount;

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

                                            lockFile.unlock(lockPath, () => {
                                                let message = this.req.__('Message.seatsLimit{{limit}}', {limit: limit.toString()});
                                                this.res.redirect(`${this.router.build('customer.reserve.seats', {token: token})}?message=${encodeURIComponent(message)}`);

                                            });

                                        } else {
                                            // 仮予約あればキャンセルする
                                            this.logger.debug('processCancelSeats processing...');
                                            this.processCancelSeats(reservationModel, (err, reservationModel) => {
                                                this.logger.debug('processCancelSeats processed.', err);

                                                // 座席FIX
                                                this.logger.debug('processFixSeats processing...', reservationModel.token, seatCodes);
                                                this.processFixSeats(reservationModel, seatCodes, (err, reservationModel) => {
                                                    this.logger.debug('processFixSeats processed.', reservationModel.token, err);
                                                    lockFile.unlock(lockPath, () => {

                                                        // 仮予約に失敗した座席コードがあった場合
                                                        if (err) {
                                                            reservationModel.save((err) => {
                                                                let message = this.req.__('Mesasge.SelectedSeatsUnavailable');
                                                                this.res.redirect(`${this.router.build('customer.reserve.seats', {token: token})}?message=${encodeURIComponent(message)}`);
                                                            });
                                                        } else {
                                                            reservationModel.save((err) => {
                                                                // 券種選択へ
                                                                this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));
                                                            });
                                                        }

                                                    });

                                                });

                                            });

                                        }

                                    } else {
                                        lockFile.unlock(lockPath, () => {
                                            this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));

                                        });

                                    }

                                });
                            } else {

                                lockFile.unlock(lockPath, (err) => {
                                    this.res.render('customer/reserve/seats', {
                                        reservationModel: reservationModel,
                                        limit: limit
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
                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));
                    } else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.profile', {token: token}));
                        });
                    }
                });
            } else {
                this.res.render('customer/reserve/tickets', {
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
                        this.res.render('customer/reserve/profile', {
                            reservationModel: reservationModel
                        });
                    } else {
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));
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

                this.res.render('customer/reserve/profile', {
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
                        this.res.redirect(`${this.router.build('customer.reserve.confirm', {token: token})}?message=${encodeURIComponent(message)}`);
                    } else {
                        reservationModel.save((err) => {
                            this.logger.info('starting GMO payment...');
                            this.res.redirect(307, this.router.build('gmo.reserve.start', {token: token}));
                        });
                    }
                });
            } else {
                this.res.render('customer/reserve/confirm', {
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
                status: ReservationUtil.STATUS_WAITING_SETTLEMENT
            },
            null,
            {
                sort : {
                    seat_code: 1
                }
            },
            (err, reservationDocuments) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservationDocuments.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                this.res.render('customer/reserve/waitingSettlement', {
                    reservationDocuments: reservationDocuments
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
                status: ReservationUtil.STATUS_RESERVED
            },
            null,
            {
                sort : {
                    seat_code: 1
                }
            },
            (err, reservationDocuments) => {
                if (err) return this.next(new Error(this.req.__('Message.UnexpectedError')));
                if (reservationDocuments.length === 0) return this.next(new Error(this.req.__('Message.NotFound')));

                this.res.render('customer/reserve/complete', {
                    reservationDocuments: reservationDocuments
                });

            }
        );
    }
}
