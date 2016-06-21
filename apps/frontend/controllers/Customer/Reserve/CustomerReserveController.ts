import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import CustomerReserveTermsForm from '../../../forms/Customer/Reserve/CustomerReserveTermsForm';
import CustomerReservePerformanceForm from '../../../forms/Customer/Reserve/CustomerReservePerformanceForm';
import CustomerReserveSeatForm from '../../../forms/Customer/Reserve/CustomerReserveSeatForm';
import CustomerReserveTicketForm from '../../../forms/Customer/Reserve/CustomerReserveTicketForm';
import CustomerReserveProfileForm from '../../../forms/Customer/Reserve/CustomerReserveProfileForm';
import CustomerReservePayForm from '../../../forms/Customer/Reserve/CustomerReservePayForm';
import CustomerReserveConfirmForm from '../../../forms/Customer/Reserve/CustomerReserveConfirmForm';

import conf = require('config');
import Models from '../../../../common/models/Models';
import StockUtil from '../../../../common/models/Stock/StockUtil';

let MONGOLAB_URI = conf.get<string>('mongolab_uri');
import mongoose = require('mongoose');

import ReservationModel from '../../../models/Reserve/ReservationModel';

export default class CustomerReserveController extends BaseController {
    public terms(): void {
        let customerReserveTermsForm = new CustomerReserveTermsForm();
        if (this.req.method === 'POST') {

            customerReserveTermsForm.form.handle(this.req, {
                success: (form) => {
                    customerReserveTermsForm.form = form;

                    // 予約トークンを発行してスケジュール選択へ
                    let token = Util.createToken();
                    let reservationModel = new ReservationModel();
                    reservationModel.token = token;
                    reservationModel.save((err) => {
                        this.res.redirect(this.router.build('customer.reserve.performances', {token: token}));
                    });
                },
                error: (form) => {
                    return this.res.render('customer/reserve/terms', {
                        form: form,
                    });
                },
                empty: (form) => {
                    return this.res.render('customer/reserve/terms', {
                        form: form,
                    });
                }
            });
        } else {
            this.res.render('customer/reserve/terms', {
                form: customerReserveTermsForm.form
            });
        }
    }

    public performances(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReservePerformanceForm = new CustomerReservePerformanceForm();
            if (this.req.method === 'POST') {

                customerReservePerformanceForm.form.handle(this.req, {
                    success: (form) => {
                        customerReservePerformanceForm.form = form;

                        // パフォーマンス取得
                        this.logger.debug('searching performance... id:', form.data.performance_id);
                        mongoose.connect(MONGOLAB_URI);
                        Models.Performance.findOne({_id: form.data.performance_id}, {})
                            .populate('film screen theater') // スペースつなぎで、複数populateできる
                            .exec((err, performance) => {

                            mongoose.disconnect();

                            if (err) {
                                return this.next(err);
                            }

                            // パフォーマンス情報を保存して座席選択へ
                            reservationModel.performance = {
                                _id: performance._id,
                                day: performance.get('day'),
                                start_time: performance.get('start_time'),
                                end_time: performance.get('end_time'),
                                theater: {
                                    _id: performance.get('theater').get('_id'),
                                    name: performance.get('theater').get('name'),
                                    name_en: performance.get('theater').get('name_en'),
                                },
                                screen: {
                                    _id: performance.get('screen').get('_id'),
                                    name: performance.get('screen').get('name'),
                                    name_en: performance.get('screen').get('name_en'),
                                },
                                film: {
                                    _id: performance.get('film').get('_id'),
                                    name: performance.get('film').get('name'),
                                    name_en: performance.get('film').get('name_en'),
                                }
                            };

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                            });
                        });
                    },
                    error: (form) => {
                        this.next(new Error('不適切なアクセスです'));
                    },
                    empty: (form) => {
                        this.next(new Error('不適切なアクセスです'));
                    }
                });
            } else {
                // パフォーマンスを取得
                mongoose.connect(MONGOLAB_URI);

                Models.Performance.find({}, null, {sort : {film: 1, day: 1, start_time: 1}, limit: 100})
                    .populate('film screen theater') // スペースつなぎで、複数populateできる
                    .exec((err, performances) => {
                    mongoose.disconnect();

                    if (err) {
                        this.next(new Error('スケジュールを取得できませんでした'));
                    } else {
                        // TODO ここで画面表示に合わせて整形処理を入れる

                        this.res.render('customer/reserve/performances', {
                            form: customerReservePerformanceForm.form,
                            performances: performances
                        });
                    }
                });
            }
        });
    }

    public seats(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReserveSeatForm = new CustomerReserveSeatForm();
            if (this.req.method === 'POST') {

                customerReserveSeatForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveSeatForm.form = form;

                        // 仮押さえ
                        mongoose.connect(MONGOLAB_URI);

                        let stockIds: Array<string> = JSON.parse(form.data.stockIds);
                        let promises = [];
                        for (let stockId of stockIds) {
                            promises.push(new Promise((resolve, reject) => {

                                this.logger.debug('findOneAndUpdate processing...');
                                Models.Stock.findOneAndUpdate(
                                    { _id: stockId, status: StockUtil.STATUS_AVAILABLE},
                                    {status: StockUtil.STATUS_TEMPORARY},
                                    {new: true},
                                    (err, stock) => {

                                    if (err) {
                                        resolve();
                                    } else {

                                        // ステータス更新に成功したらセッションに保管
                                        reservationModel.stocks.push({
                                            _id: stock.get('id'),
                                            seat_code: stock.get('seat_code'),
                                            status: stock.get('status'),
                                            performance: stock.get('performance'),
                                        });

                                        resolve();
                                    }
                                });

                            }));
                        }

                        reservationModel.stocks = [];

                        Promise.all(promises).then(() => {
                            mongoose.disconnect();

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                // 仮押さえできていない在庫があった場合
                                if (stockIds.length > reservationModel.stocks.length) {
                                    this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                                } else {
                                    this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));
                                }
                            });

                        }, (err) => {
                            return this.next(err);
                        });


                    },
                    error: (form) => {
                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                    },
                    empty: (form) => {
                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                    }
                });
            } else {
                // パフォーマンスを取得
                mongoose.connect(MONGOLAB_URI);

                Models.Performance.findOne({_id: reservationModel.performance._id}, null)
                    .populate('film screen theater')
                    .exec((err, performance) => {

                    if (err) {
                        return this.next(new Error('スケジュールを取得できませんでした'));
                    }

                    // 在庫リストを取得
                    Models.Stock.find({performance: performance.get(('id'))}, null, null, (err, stocks) => {
                        mongoose.disconnect();

                        // 座席コードごとのオブジェクトに整形
                        let stocksBySeatCode = {};
                        for (let stock of stocks) {
                            stocksBySeatCode[stock.get('seat_code')] = stock;
                        }

                        if (err) {
                            this.next(new Error('スケジュールを取得できませんでした'));
                        } else {
                            this.res.render('customer/reserve/seats', {
                                form: customerReserveSeatForm.form,
                                performance: performance,
                                stocksBySeatCode: stocksBySeatCode
                            });
                        }
                    })
                });
            }
        });
    }

    public tickets(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReserveTicketForm = new CustomerReserveTicketForm();
            if (this.req.method === 'POST') {

                customerReserveTicketForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveTicketForm.form = form;

                        // 座席選択情報を保存して座席選択へ
                        reservationModel.seatChoices = [];
                        let choices = JSON.parse(form.data.choices);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                reservationModel.seatChoices.push({
                                    code: choice.code,
                                    ticket: {
                                        type: choice.ticket.type,
                                        name: choice.ticket.name,
                                        name_en: choice.ticket.name_en,
                                        price: parseInt(choice.ticket.price),
                                    }
                                });
                            });
                        } else {
                            return this.next(new Error('不適切なアクセスです'));
                        }

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.profile', {token: token}));
                        });


                    },
                    error: (form) => {
                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));
                    },
                    empty: (form) => {
                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));
                    }
                });
            } else {
                // パフォーマンスを取得
                mongoose.connect(MONGOLAB_URI);

                Models.Performance.findOne({_id: reservationModel.performance._id}, null)
                    .populate('film screen theater')
                    .exec((err, performance) => {

                    mongoose.disconnect();

                    if (err) {
                        return this.next(new Error('スケジュールを取得できませんでした'));
                    }

                    let stocksBySeatCode = {};
                    for (let stock of reservationModel.stocks) {
                        stocksBySeatCode[stock.seat_code] = stock;
                    }

                    this.res.render('customer/reserve/tickets', {
                        form: customerReserveTicketForm.form,
                        performance: performance,
                        reservationModel: reservationModel,
                        stocksBySeatCode: stocksBySeatCode,
                    });
                });
            }
        });
    }

    public profile(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReserveProfileForm = new CustomerReserveProfileForm();
            if (this.req.method === 'POST') {

                customerReserveProfileForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveProfileForm.form = form;

                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: form.data.last_name,
                            first_name: form.data.first_name,
                            email: form.data.email,
                            tel: form.data.tel,
                        };

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.pay', {token: token}));
                        });
                    },
                    error: (form) => {
                        return this.res.render('customer/reserve/profile', {
                            form: form,
                        });
                    },
                    empty: (form) => {
                        return this.res.render('customer/reserve/profile', {
                            form: form,
                        });
                    }
                });
            } else {
                this.res.render('customer/reserve/profile', {
                    form: customerReserveProfileForm.form
                });
            }
        });
    }

    public pay(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReservePayForm = new CustomerReservePayForm();
            if (this.req.method === 'POST') {

                customerReservePayForm.form.handle(this.req, {
                    success: (form) => {
                        customerReservePayForm.form = form;

                        // 決済方法情報を保存して座席選択へ
                        reservationModel.paymentMethod = form.data.method;

                        this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save((err) => {
                            this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));
                        });
                    },
                    error: (form) => {
                        return this.res.render('customer/reserve/pay', {
                            form: form,
                        });
                    },
                    empty: (form) => {
                        return this.res.render('customer/reserve/pay', {
                            form: form,
                        });
                    }
                });
            } else {
                this.res.render('customer/reserve/pay', {
                    form: customerReservePayForm.form
                });
            }
        });
    }

    public confirm(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReserveConfirmForm = new CustomerReserveConfirmForm();
            if (this.req.method === 'POST') {

                customerReserveConfirmForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveConfirmForm.form = form;

                        this.logger.debug('removing reservationModel... ', reservationModel);
                        reservationModel.remove(() => {
                            if (err) {

                            } else {
                                // TODO 購入処理
                                let reservations = reservationModel.toReservationDocuments();

                                // DB保存
                                mongoose.connect(MONGOLAB_URI, {}, (err) => {
                                    Models.Reservation.create(reservations, (err, reservations) => {
                                        mongoose.disconnect(() => {
                                            console.log(reservations);
                                            if (err) {
                                                return this.next(err);
                                            }

                                            this.res.redirect(this.router.build('customer.reserve.complete', {token: token}));
                                        });
                                    });

                                });
                            }
                        });
                    },
                    error: (form) => {
                        return this.res.render('customer/reserve/confirm', {
                            form: form,
                            reservationModel: reservationModel
                        });
                    },
                    empty: (form) => {
                        return this.res.render('customer/reserve/confirm', {
                            form: form,
                            reservationModel: reservationModel
                        });
                    }
                });
            } else {
                this.res.render('customer/reserve/confirm', {
                    form: customerReserveConfirmForm.form,
                    reservationModel: reservationModel
                });
            }
        });
    }

    public complete(): void {
        this.res.render('customer/reserve/complete', {
        });
    }
}
