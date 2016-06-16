import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import CustomerReserveTermsForm from '../../../forms/Customer/Reserve/CustomerReserveTermsForm';
import CustomerReservePerformanceForm from '../../../forms/Customer/Reserve/CustomerReservePerformanceForm';
import CustomerReserveSeatForm from '../../../forms/Customer/Reserve/CustomerReserveSeatForm';
import CustomerReserveProfileForm from '../../../forms/Customer/Reserve/CustomerReserveProfileForm';
import CustomerReserveHowtopayForm from '../../../forms/Customer/Reserve/CustomerReserveHowtopayForm';
import CustomerReserveConfirmForm from '../../../forms/Customer/Reserve/CustomerReserveConfirmForm';

import conf = require('config');
import PerformanceSchema from '../../../../common/schemas/PerformanceSchema';
import * as Models from '../../../../common/models/Models';

let MONGOLAB_URI = conf.get<string>('mongolab_uri');
let mongoose = require('mongoose');

export default class CustomerReserveController extends BaseController {
    public terms(): void {
        let customerReserveTermsForm = new CustomerReserveTermsForm();
        if (this.req.method === 'POST') {

            customerReserveTermsForm.form.handle(this.req, {
                success: (form) => {
                    customerReserveTermsForm.form = form;

                    // 予約トークンを発行してスケジュール選択へ
                    let token = Util.createToken();
                    this.res.redirect(this.router.build('customer.reserve.performances', {token: token}));
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

        let customerReservePerformanceForm = new CustomerReservePerformanceForm();
        if (this.req.method === 'POST') {

            customerReservePerformanceForm.form.handle(this.req, {
                success: (form) => {
                    customerReservePerformanceForm.form = form;

                    this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                },
                error: (form) => {
                    return this.res.render('customer/reserve/performances', {
                        form: form,
                    });
                },
                empty: (form) => {
                    return this.res.render('customer/reserve/performances', {
                        form: form,
                    });
                }
            });
        } else {
            // パフォーマンスを取得
            mongoose.connect(MONGOLAB_URI);
            // let Performance = mongoose.model('performance', PerformanceSchema);
            Models.Performance.find()
                .populate('film_id')
                .exec((err, performances) => {
                mongoose.disconnect();
console.log(performances);
                if (err) {
                    this.next(new Error('スケジュールを取得できませんでした'));
                } else {
                    this.res.render('customer/reserve/performances', {
                        form: customerReservePerformanceForm.form,
                        performances: performances
                    });
                }
            });

            // Performance.find({}, null, {sort : {day: -1}, limit: 100}, (err, docs)=> {
            //     mongoose.disconnect();

            //     if (err) {
            //         this.next(new Error('お知らせを取得できませんでした'));
            //     } else {
            //         this.res.render('customer/reserve/performances', {
            //             form: customerReservePerformanceForm.form,
            //             performances: docs
            //         });
            //     }
            // });
        }
    }

    public seats(): void {
        let token = this.req.params.token;

        let customerReservePerformanceForm = new CustomerReservePerformanceForm();
        if (this.req.method === 'POST') {

            customerReservePerformanceForm.form.handle(this.req, {
                success: (form) => {
                    customerReservePerformanceForm.form = form;

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
            this.res.render('customer/reserve/seats', {
                form: customerReservePerformanceForm.form
            });
        }
    }

    public profile(): void {
        let token = this.req.params.token;

        let customerReservePerformanceForm = new CustomerReservePerformanceForm();
        if (this.req.method === 'POST') {

            customerReservePerformanceForm.form.handle(this.req, {
                success: (form) => {
                    customerReservePerformanceForm.form = form;

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
                form: customerReservePerformanceForm.form
            });
        }
    }

    public howtopay(): void {
        let token = this.req.params.token;

        let customerReservePerformanceForm = new CustomerReservePerformanceForm();
        if (this.req.method === 'POST') {

            customerReservePerformanceForm.form.handle(this.req, {
                success: (form) => {
                    customerReservePerformanceForm.form = form;

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
                form: customerReservePerformanceForm.form
            });
        }
    }

    public confirm(): void {
        let token = this.req.params.token;

        let customerReservePerformanceForm = new CustomerReservePerformanceForm();
        if (this.req.method === 'POST') {

            customerReservePerformanceForm.form.handle(this.req, {
                success: (form) => {
                    customerReservePerformanceForm.form = form;

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
                form: customerReservePerformanceForm.form
            });
        }
    }

    public complete(): void {
        this.res.render('customer/reserve/complete', {
        });
    }
}
