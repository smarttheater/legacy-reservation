import BaseController from '../../BaseController';
import Util from '../../../../common/Util/Util';
import CustomerReserveTermsForm from '../../../forms/Customer/Reserve/CustomerReserveTermsForm';
import CustomerReservePerformanceForm from '../../../forms/Customer/Reserve/CustomerReservePerformanceForm';
import CustomerReserveSeatForm from '../../../forms/Customer/Reserve/CustomerReserveSeatForm';
import CustomerReserveTicketForm from '../../../forms/Customer/Reserve/CustomerReserveTicketForm';
import CustomerReserveProfileForm from '../../../forms/Customer/Reserve/CustomerReserveProfileForm';
import CustomerReservePayForm from '../../../forms/Customer/Reserve/CustomerReservePayForm';
import CustomerReserveConfirmForm from '../../../forms/Customer/Reserve/CustomerReserveConfirmForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';

import mongoose = require('mongoose');

import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

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
                    reservationModel.paymentNo = Util.createPaymentNo();
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
                        this.useMongoose(() => {
                            Models.Performance.findOne({_id: form.data.performance_id}, {})
                                .populate('film screen theater') // スペースつなぎで、複数populateできる
                                .exec((err, performance) => {

                                mongoose.disconnect(() => {

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

                                    reservationModel.seatCodes = [];
                                    reservationModel.ticketChoices = [];

                                    this.logger.debug('saving reservationModel... ', reservationModel);
                                    reservationModel.save((err) => {
                                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                                    });
                                });
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
                this.useMongoose(() => {
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
                        // まず仮押さえしてから、仮押さえキャンセル
                        this.useMongoose(() => {

                            let seatCodes: Array<string> = JSON.parse(form.data.codes);
                            let seatCodesInSession = (reservationModel.seatCodes) ? reservationModel.seatCodes : [];
                            let promises: Array<Promise<Function>> = [];

                            // セッション中の在庫リストを初期化
                            reservationModel.seatCodes = [];

                            for (let seatCodeInSession of seatCodesInSession) {
                                if (seatCodes.indexOf(seatCodeInSession) >= 0) {

                                // 座席選択肢になければ、空席ステータスに戻す(削除しちゃう)
                                } else {
                                    promises.push(new Promise((resolve, reject) => {

                                        this.logger.debug('STATUS_TEMPORARY to STATUS_AVAILABLE processing...seatCodeInSession:', seatCodeInSession);
                                        Models.Reservation.remove(
                                            {
                                                payment_no: reservationModel.paymentNo,
                                                seat_code: seatCodeInSession,
                                                status: ReservationUtil.STATUS_TEMPORARY,
                                            },
                                        (err) => {

                                            // 失敗したとしても時間経過で消えるので放置
                                            if (err) {
                                            } else {
                                            }

                                            resolve();
                                        });

                                    }));
                                }
                            }

                            for (let seatCode of seatCodes) {
                                // すでに仮押さえ済みであれば、セッションに加えるだけ
                                if (seatCodesInSession.indexOf(seatCode) >= 0) {
                                    promises.push(new Promise((resolve, reject) => {
                                        reservationModel.seatCodes.push(seatCode);

                                        resolve();
                                    }));
                                // 新規仮押さえであれば、検索して仮押さえトライ
                                } else {
                                    promises.push(new Promise((resolve, reject) => {

                                        this.logger.debug('findOneAndUpdate processing...');
                                        Models.Reservation.findOneAndUpdate(
                                            {
                                                payment_no: reservationModel.paymentNo,
                                                performance: reservationModel.performance._id,
                                                seat_code: seatCode,
                                                status: ReservationUtil.STATUS_AVAILABLE
                                            },
                                            {
                                                status: ReservationUtil.STATUS_TEMPORARY
                                            },
                                            {
                                                new: true,
                                                upsert: true,
                                            },
                                        (err, reservationDocument) => {

                                            if (err) {
                                            } else {
                                                if (reservationDocument) {
                                                    // ステータス更新に成功したらセッションに保管
                                                    reservationModel.seatCodes.push(reservationDocument.get('seat_code'));
                                                }
                                            }

                                            resolve();
                                        });

                                    }));
                                }
                            }




                            // update multiで一度に更新したいが、更新できなかった在庫IDがあった場合に、それがどのIDかをすぐに追えない(更新数のみ取得できる)
                            // であれば、ひとつずつ更新した方が、それぞれの状態を追えて、ユーザーに状態の詳細を知らせることができる
                            /*
                            this.logger.debug('update processing...stockIds:', stockIds);
                            Models.Stock.update(
                                {
                                    _id: {$in: stockIds},
                                    status: StockUtil.STATUS_AVAILABLE,
                                    $isolated : true,
                                },
                                {
                                    status: StockUtil.STATUS_TEMPORARY,
                                },
                                {
                                    multi: true,
                                },
                                (err, raw) => {
                                this.logger.debug('update processed.', err, raw);


                            });
                            */




                            Promise.all(promises).then(() => {
                                mongoose.disconnect();

                                this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save((err) => {
                                    // 仮押さえできていない在庫があった場合
                                    if (seatCodes.length > reservationModel.seatCodes.length) {
                                        // TODO メッセージ？
                                        this.res.redirect(this.router.build('customer.reserve.seats', {token: token}));
                                    } else {
                                        this.res.redirect(this.router.build('customer.reserve.tickets', {token: token}));
                                    }
                                });

                            }, (err) => {
                                return this.next(err);
                            });

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

                this.useMongoose(() => {

                    Models.Performance.findOne({_id: reservationModel.performance._id}, null)
                        .populate('film screen theater')
                        .exec((err, performance) => {

                        if (err) {
                            return this.next(new Error('スケジュールを取得できませんでした'));
                        }

                        // 予約リストを取得
                        Models.Reservation.find({performance: performance.get(('id'))}, null, null, (err, reservationDocuments) => {

                            mongoose.disconnect();

                            // 座席コードごとのオブジェクトに整形
                            let reservationDocumentsBySeatCode = {};
                            for (let reservationDocument of reservationDocuments) {
                                reservationDocumentsBySeatCode[reservationDocument.get('seat_code')] = reservationDocument;
                            }

                            // 販売座席リストを座席コードごとのオブジェクトに整形
                            let performanceSeatDocumentsBySeatCode = {};
                            for (let seatDocument of performance.get('seats')) {
                                performanceSeatDocumentsBySeatCode[seatDocument.get('code')] = seatDocument;
                            }

                            if (err) {
                                this.next(new Error('スケジュールを取得できませんでした'));
                            } else {
                                this.res.render('customer/reserve/seats', {
                                    form: customerReserveSeatForm.form,
                                    performance: performance,
                                    reservationDocumentsBySeatCode: reservationDocumentsBySeatCode,
                                    reservationModel: reservationModel,
                                    performanceSeatDocumentsBySeatCode: performanceSeatDocumentsBySeatCode,
                                });
                            }
                        })
                    });
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
                        reservationModel.ticketChoices = [];
                        let choices = JSON.parse(form.data.choices);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                reservationModel.ticketChoices.push({
                                    seat_code: choice.seat_code,
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
                this.useMongoose(() => {

                    Models.Performance.findOne({_id: reservationModel.performance._id}, {})
                        .populate('film screen theater')
                        .exec((err, performanceDocument) => {

                        mongoose.disconnect();

                        if (err) {
                            return this.next(new Error('スケジュールを取得できませんでした'));
                        }

                        // 仮押さえ中の座席情報を取得
                        let seatDocuments = [];
                        for (let seatDocument of performanceDocument.get('seats')) {
                            if (reservationModel.seatCodes.indexOf(seatDocument.get('code')) >= 0) {
                                seatDocuments.push(seatDocument);
                            }

                            if (seatDocuments.length === reservationModel.seatCodes.length) {
                                break;
                            }
                        }

                        // 座席コードごとの券種選択リスト
                        let ticketChoices = (reservationModel.ticketChoices) ? reservationModel.ticketChoices : [];
                        let ticketChoicesBySeatCode = {};
                        for (let ticketChoice of ticketChoices) {
                            ticketChoicesBySeatCode[ticketChoice.seat_code] = ticketChoice;
                        }

                        this.res.render('customer/reserve/tickets', {
                            form: customerReserveTicketForm.form,
                            reservationModel: reservationModel,
                            seatDocuments: seatDocuments,
                            ticketChoicesBySeatCode: ticketChoicesBySeatCode,
                        });
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
                // TODO 初期値設定

                this.res.render('customer/reserve/profile', {
                    form: customerReserveProfileForm.form,
                    reservationModel: reservationModel,
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
                    form: customerReservePayForm.form,
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
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let customerReserveConfirmForm = new CustomerReserveConfirmForm();
            if (this.req.method === 'POST') {

                customerReserveConfirmForm.form.handle(this.req, {
                    success: (form) => {
                        customerReserveConfirmForm.form = form;

                        this.res.redirect(this.router.build('customer.reserve.process', {token: token}));
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

    public process(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
            } else {
                // 予約情報セッション削除
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(() => {
                    if (err) {

                    } else {
                        // GMOからの結果受信にそなえてセッションを新規に作成する
                        reservationModel.token = Util.createToken();
                        reservationModel.save((err) => {
                            // GMOへ遷移画面
                            this.res.render('customer/reserve/processGMODev', {
                                layout: false,
                                reservationModel: reservationModel
                            });
                        });
                    }
                });
            }
        });
    }

    /**
     * GMOからの結果受信
     */
    public fromGMO(): void {
        let token = this.req.body.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            if (this.req.method === 'POST') {
                // 予約情報セッション削除
                // これ以降、予約情報はローカルに引き回す
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(() => {
                    if (err) {

                    } else {
                        // DB保存
                        this.useMongoose(() => {
                            // 予約ステータス更新
                            let reservedDocuments: Array<mongoose.Document> = [];
                            // let reservations = reservationModel.toReservationDocuments();

                            let promises = [];
                            for (let choice of reservationModel.ticketChoices) {
                                promises.push(new Promise((resolve, reject) => {

                                    this.logger.debug('STATUS_TEMPORARY to STATUS_RESERVED processing...seat_code:', choice.seat_code);
                                    Models.Reservation.findOneAndUpdate(
                                        {
                                            payment_no: reservationModel.paymentNo,
                                            seat_code: choice.seat_code,
                                            status: ReservationUtil.STATUS_TEMPORARY
                                        },
                                        {
                                            'status': ReservationUtil.STATUS_RESERVED,
                                            'performance': reservationModel.performance._id,
                                            'performance_day': reservationModel.performance.day,
                                            'performance_start_time': reservationModel.performance.start_time,
                                            'performance_end_time': reservationModel.performance.end_time,
                                            'theater': reservationModel.performance.theater._id,
                                            'theater_name': reservationModel.performance.theater.name,
                                            'screen': reservationModel.performance.screen._id,
                                            'screen_name': reservationModel.performance.screen.name,
                                            'film': reservationModel.performance.film._id,
                                            'film_name': reservationModel.performance.film.name,
                                            'purchaser_last_name': reservationModel.profile.last_name,
                                            'purchaser_first_name': reservationModel.profile.first_name,
                                            'purchaser_email': reservationModel.profile.email,
                                            'purchaser_tel': reservationModel.profile.tel,
                                            'ticket_type': choice.ticket.type,
                                            'ticket_name': choice.ticket.name,
                                            'created_user': this.constructor.toString(),
                                            'updated_user': this.constructor.toString(),
                                        },
                                        {
                                            new: true
                                        },
                                    (err, reservationDocument) => {

                                        this.logger.info('STATUS_TEMPORARY to STATUS_RESERVED processed.', err, reservationDocument, reservationModel);

                                        if (err) {
                                        } else {
                                            // ステータス更新に成功したらリストに追加
                                            reservedDocuments.push(reservationDocument);
                                        }

                                        resolve();
                                    });

                                }));
                            }

                            Promise.all(promises).then(() => {

                                // 予約できていない在庫があった場合
                                if (reservationModel.seatCodes.length > reservedDocuments.length) {
                                    this.res.redirect(this.router.build('customer.reserve.confirm', {token: token}));
                                } else {
                                    // TODO 購入処理
                                    this.res.redirect(this.router.build('customer.reserve.complete', {token: token}));

                                }

                            }, (err) => {
                                return this.next(err);
                            });

                        });

                    }
                });
            } else {
            }
        });

    }

    public complete(): void {
        let token = this.req.params.token;
        // ReservationResultModel.find(token, (err, reservationResultModel) => {
        //     if (err || reservationResultModel === null) {
        ReservationModel.find(token, (err, reservationModel) => {
            console.log(reservationModel);
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.res.render('customer/reserve/complete', {
                reservationModel: reservationModel,
            });
        });
    }
}
