import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import CustomerReserveTermsForm from '../../../forms/Customer/Reserve/CustomerReserveTermsForm';
import CustomerReservePerformanceForm from '../../../forms/Customer/Reserve/CustomerReservePerformanceForm';
import CustomerReserveSeatForm from '../../../forms/Customer/Reserve/CustomerReserveSeatForm';
import CustomerReserveProfileForm from '../../../forms/Customer/Reserve/CustomerReserveProfileForm';
import CustomerReserveHowtopayForm from '../../../forms/Customer/Reserve/CustomerReservePayForm';
import CustomerReserveConfirmForm from '../../../forms/Customer/Reserve/CustomerReserveConfirmForm';

import conf = require('config');
import Models from '../../../../common/mongooseModels/Models';

let MONGOLAB_URI = conf.get<string>('mongolab_uri');
let mongoose = require('mongoose');

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
                        Models.Performance.findOne({_id: form.data.performance_id}, {}, (err, performance) => {
                            mongoose.disconnect();

                            if (err) {
                                return this.next(err);
                            }

                            this.logger.debug('selected performance is ', performance);

                            // パフォーマンス情報を保存して座席選択へ
                            reservationModel.performance = performance.toObject();
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

                // PerformanceModel.find({}, null, {sort : {day: -1}, limit: 100})
                Models.Performance.find({}, null, {sort : {day: -1}, limit: 100})
                    .populate('film screen theater') // スペースつなぎで、複数populateできる
                    .exec((err, performances) => {
                    mongoose.disconnect();

                    let performance = new Models.Performance(performances[0]);
                    console.log(performance.get('theater'));
                    console.log(performance.isModified('theater'));


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

            let customerReserveSeatForm = new CustomerReserveSeatForm();
            if (this.req.method === 'POST') {

                customerReserveSeatForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveSeatForm.form = form;

                        this.res.redirect(this.router.build('customer.reserve.profile', {token: token}));
                    },
                    error: (form) => {
                        return this.res.render('customer/reserve/seats', {
                            form: form,
                        });
                    },
                    empty: (form) => {
                        return this.res.render('customer/reserve/seats', {
                            form: form,
                        });
                    }
                });
            } else {
                // パフォーマンスを取得
                mongoose.connect(MONGOLAB_URI);
                let performanceModel = new Models.Performance(reservationModel.performance);
                Models.Performance.findOne({_id: performanceModel.get(('id'))}, null)
                    .populate('film screen theater')
                    .exec((err, performance) => {
                    // TODO 予約座席リストを取得

                    mongoose.disconnect();

                    if (err) {
                        this.next(new Error('スケジュールを取得できませんでした'));
                    } else {
                        this.res.render('customer/reserve/seats', {
                            form: customerReserveSeatForm.form,
                            performance: performance
                        });
                    }
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

            let customerReserveProfileForm = new CustomerReserveProfileForm();
            if (this.req.method === 'POST') {

                customerReserveProfileForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveProfileForm.form = form;

                        this.res.redirect(this.router.build('customer.reserve.howtopay', {token: token}));
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

    public howtopay(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            let customerReserveHowtopayForm = new CustomerReserveHowtopayForm();
            if (this.req.method === 'POST') {

                customerReserveHowtopayForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveHowtopayForm.form = form;

                        this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));
                    },
                    error: (form) => {
                        return this.res.render('customer/reserve/howtopay', {
                            form: form,
                        });
                    },
                    empty: (form) => {
                        return this.res.render('customer/reserve/howtopay', {
                            form: form,
                        });
                    }
                });
            } else {
                this.res.render('customer/reserve/howtopay', {
                    form: customerReserveHowtopayForm.form
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

            let customerReserveConfirmForm = new CustomerReserveConfirmForm();
            if (this.req.method === 'POST') {

                customerReserveConfirmForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveConfirmForm.form = form;

                        this.res.redirect(this.router.build('customer.reserve.complete', {token: token}));
                    },
                    error: (form) => {
                        return this.res.render('customer/reserve/confirm', {
                            form: form,
                        });
                    },
                    empty: (form) => {
                        return this.res.render('customer/reserve/confirm', {
                            form: form,
                        });
                    }
                });
            } else {
                this.res.render('customer/reserve/confirm', {
                    form: customerReserveConfirmForm.form
                });
            }
        });
    }

    public complete(): void {
        this.res.render('customer/reserve/complete', {
        });
    }
}
