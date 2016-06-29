import BaseController from '../../BaseController';
import StaffUser from '../../../models/User/StaffUser';
import Util from '../../../../common/Util/Util';
import StaffReservePerformanceForm from '../../../forms/Staff/Reserve/StaffReservePerformanceForm';
import StaffReserveSeatForm from '../../../forms/Staff/Reserve/StaffReserveSeatForm';
import StaffReserveTicketForm from '../../../forms/Staff/Reserve/StaffReserveTicketForm';

import Models from '../../../../common/models/Models';
import ReservationUtil from '../../../../common/models/Reservation/ReservationUtil';
import mongoose = require('mongoose');
import ReservationModel from '../../../models/Reserve/ReservationModel';
import ReservationResultModel from '../../../models/Reserve/ReservationResultModel';

export default class StaffReserveController extends BaseController {
    /**
     * スケジュール選択
     */
    public performances(): void {
        let staffReservePerformanceForm = new StaffReservePerformanceForm();
        if (this.req.method === 'POST') {

            staffReservePerformanceForm.form.handle(this.req, {
                success: (form) => {
                    staffReservePerformanceForm.form = form;

                    // パフォーマンス取得
                    this.logger.debug('searching performance... id:', form.data.performance_id);
                    Models.Performance.findOne(
                        {
                            _id: form.data.performance_id
                        },
                        {}
                    ).populate('film screen theater').exec((err, performanceDocument) => {

                        if (err) {
                            this.next(err);
                        } else {


                            // 予約トークンを発行
                            let token = Util.createToken();
                            let reservationModel = new ReservationModel();
                            reservationModel.token = token;
                            reservationModel.staff_signature = this.staffUser.get('signature');

                            reservationModel.reservationIds = [];

                            // 座席コードごとの券種選択肢リスト
                            let ticketChoicesBySeatCode = {};
                            for (let seatDocument of performanceDocument.get('seats')) {
                                // TODO 内部関係者の場合、ひとまず券種リストを固定にしておく
                                // ticketChoicesBySeatCode[seatDocument.get('code')] = seatDocument.get('tickets');
                                ticketChoicesBySeatCode[seatDocument.get('code')] = [
                                    {
                                        type: '01',
                                        name: '無料',
                                        name_en: 'free',
                                        price: 0,
                                    },
                                    {
                                        type: '02',
                                        name: '有料',
                                        name_en: 'charge',
                                        price: 1500,
                                    },
                                ];
                            }
                            reservationModel.ticketChoicesBySeatCode = ticketChoicesBySeatCode;


                            // パフォーマンス情報を保存して座席選択へ
                            reservationModel.performance = {
                                _id: performanceDocument.get('_id'),
                                day: performanceDocument.get('day'),
                                start_time: performanceDocument.get('start_time'),
                                end_time: performanceDocument.get('end_time'),
                                theater: {
                                    _id: performanceDocument.get('theater').get('_id'),
                                    name: performanceDocument.get('theater').get('name'),
                                    name_en: performanceDocument.get('theater').get('name_en'),
                                },
                                screen: {
                                    _id: performanceDocument.get('screen').get('_id'),
                                    name: performanceDocument.get('screen').get('name'),
                                    name_en: performanceDocument.get('screen').get('name_en'),
                                    sections: performanceDocument.get('screen').get('sections'),
                                },
                                film: {
                                    _id: performanceDocument.get('film').get('_id'),
                                    name: performanceDocument.get('film').get('name'),
                                    name_en: performanceDocument.get('film').get('name_en'),
                                }
                            };

                            // スクリーンの全座席コード
                            reservationModel.screenSeatCodes = [];
                            for (let seatDocument of performanceDocument.get('screen').get('sections')[0].get('seats')) {
                                reservationModel.screenSeatCodes.push(seatDocument.get('code'));
                            }

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('staff.reserve.seats', {token: token}));
                            });
                        }
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
            Models.Performance.find({}, {}, {sort : {film: 1, day: 1, start_time: 1}, limit: 100})
            .populate('film screen theater') // スペースつなぎで、複数populateできる
            .exec((err, performanceDocuments) => {

                if (err) {
                    this.next(new Error('スケジュールを取得できませんでした'));
                } else {

                    // TODO ここで画面表示に合わせて整形処理を入れる

                    // 作品ごとに
                    let performanceDocumentsByFilm = {};
                    for (let performanceDocument of performanceDocuments) {
                        let filmId = performanceDocument.get('film').get('id');
                        if (!performanceDocumentsByFilm.hasOwnProperty(filmId)) {
                            performanceDocumentsByFilm[filmId] = [];
                        }

                        performanceDocumentsByFilm[filmId].push(performanceDocument);
                    }

                    this.res.render('staff/reserve/performances', {
                        layout: 'layouts/staff/layout',
                        form: staffReservePerformanceForm.form,
                        performances: performanceDocuments,
                        performanceDocumentsByFilm: performanceDocumentsByFilm,
                    });
                }
            });
        }
    }

    /**
     * 座席選択
     */
    public seats(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            // 外部関係者による予約数を取得
            Models.Reservation.count(
            {
                staff: this.staffUser.get('_id')
            },
            (err, reservationsCount) => {

                let staffReserveSeatForm = new StaffReserveSeatForm();
                if (this.req.method === 'POST') {

                    staffReserveSeatForm.form.handle(this.req, {
                        success: (form) => {
                            staffReserveSeatForm.form = form;

                            let reservationIds: Array<string> = JSON.parse(form.data.reservationIds);
                            let reservationIdsInSession = reservationModel.reservationIds;

                            if (reservationIds.length < 1) {
                                this.next(new Error('不適切なアクセスです'));
                            // 座席指定可能数チェック
                            } else if (reservationIds.length > parseInt(this.sponsorUser.get('max_reservation_count')) - reservationsCount) {
                                let message = '座席指定可能枚数を超えました。';
                                this.res.redirect(this.router.build('sponsor.reserve.seats', {token: token}) + `?message=${encodeURIComponent(message)}`);
                            } else {

                                // 仮押さえ
                                // まず仮押さえしてから、仮押さえキャンセル
                                let promises: Array<Promise<Function>> = [];

                                // セッション中の予約リストを初期化
                                reservationModel.reservationIds = [];

                                reservationIdsInSession.forEach((reservationIdInSession, index) => {
                                    let reservation = reservationModel.getReservation(reservationIdInSession);

                                    if (reservationIds.indexOf(reservationIdInSession) >= 0) {

                                    } else {
                                        // 座席選択肢になければ、空席ステータスに戻す
                                        promises.push(new Promise((resolve, reject) => {

                                            this.logger.debug('updating reservation status to avalilable..._id:', reservationIdInSession);
                                            Models.Reservation.findOneAndUpdate(
                                                {
                                                    _id: reservationIdInSession,
                                                },
                                                {
                                                    status: ReservationUtil.STATUS_AVAILABLE,
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
                                });


                                reservationIds.forEach((reservationId, index) => {

                                    if (reservationIdsInSession.indexOf(reservationId) >= 0) {
                                        // すでに仮押さえ済みであれば、セッションに加えるだけ
                                        promises.push(new Promise((resolve, reject) => {
                                            reservationModel.reservationIds.push(reservationId);

                                            resolve();
                                        }));

                                    } else {

                                        // 新規仮予約
                                        promises.push(new Promise((resolve, reject) => {

                                            this.logger.debug('updating reservation status to temporary...reservationId:', reservationId);
                                            Models.Reservation.findOneAndUpdate(
                                                {
                                                    _id: reservationId,
                                                    status: ReservationUtil.STATUS_AVAILABLE // 空席ステータスのみ、新規仮登録できる(ここはポイントなので要注意！！！)
                                                },
                                                {
                                                    status: ReservationUtil.STATUS_TEMPORARY,
                                                    staff: this.staffUser.get('_id')
                                                },
                                                {
                                                    new: true,
                                                },
                                            (err, reservationDocument) => {

                                                if (err) {
                                                } else {
                                                    if (reservationDocument) {
                                                        // ステータス更新に成功したらセッションに保管
                                                        reservationModel.reservationIds.push(reservationDocument.get('_id'));
                                                        reservationModel.setReservation(reservationDocument.get('_id'), {
                                                            _id: reservationDocument.get('_id'),
                                                            status: reservationDocument.get('status'),
                                                            seat_code: reservationDocument.get('seat_code'),
                                                            performance: reservationDocument.get('performance'),
                                                        });
                                                    }
                                                }

                                                resolve();
                                            });

                                        }));
                                    }

                                });


                                Promise.all(promises).then(() => {
                                    this.logger.debug('saving reservationModel... ', reservationModel);
                                    reservationModel.save((err) => {
                                        // 仮押さえできていない在庫があった場合
                                        if (reservationIds.length > reservationModel.reservationIds.length) {
                                            // TODO メッセージ？
                                            let message = '座席を確保できませんでした。再度指定してください。';
                                            this.res.redirect(this.router.build('staff.reserve.seats', {token: token}) + `?message=${encodeURIComponent(message)}`);
                                        } else {
                                            this.res.redirect(this.router.build('staff.reserve.tickets', {token: token}));
                                        }
                                    });

                                }, (err) => {
                                    this.next(err);
                                });
                            }

                        },
                        error: (form) => {
                            this.res.redirect(this.router.build('staff.reserve.seats', {token: token}));
                        },
                        empty: (form) => {
                            this.res.redirect(this.router.build('staff.reserve.seats', {token: token}));
                        }
                    });
                } else {

                    // 予約リストを取得
                    Models.Reservation.find(
                        {
                            performance: reservationModel.performance._id
                        },
                        {},
                        {},
                        (err, reservationDocuments) => {

                            // 座席コードごとのオブジェクトに整形
                            let reservationDocumentsBySeatCode = {};
                            for (let reservationDocument of reservationDocuments) {
                                reservationDocumentsBySeatCode[reservationDocument.get('seat_code')] = reservationDocument;
                            }

                            if (err) {
                                this.next(new Error('スケジュールを取得できませんでした'));
                            } else {
                                this.res.render('staff/reserve/seats', {
                                    layout: 'layouts/staff/layout',
                                    form: staffReserveSeatForm.form,
                                    reservationDocumentsBySeatCode: reservationDocumentsBySeatCode,
                                    reservationModel: reservationModel,
                                });
                            }
                        }
                    )
                }
            });
        });
    }

    /**
     * 券種選択
     */
    public tickets(): void {
        let token = this.req.params.token;
        ReservationModel.find(token, (err, reservationModel) => {
            if (err || reservationModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.logger.debug('reservationModel is ', reservationModel);

            let staffReserveTicketForm = new StaffReserveTicketForm();
            if (this.req.method === 'POST') {

                staffReserveTicketForm.form.handle(this.req, {
                    success: (form) => {
                        staffReserveTicketForm.form = form;

                        // 座席選択情報を保存して座席選択へ
                        reservationModel.seatChoicesByStaff = [];
                        let choices = JSON.parse(form.data.choices);

                        if (Array.isArray(choices)) {
                            choices.forEach((choice) => {
                                let reservation = reservationModel.getReservation(choice.reservation_id);
                                reservation.ticket_type = choice.ticket_type;
                                reservation.ticket_name = choice.ticket_name;
                                reservation.ticket_name_en = choice.ticket_name_en;
                                reservation.ticket_price = choice.ticket_price;
                                reservation.watcher_name = choice.watcher_name;

                                reservationModel.setReservation(reservation._id, reservation);
                            });

                            this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save((err) => {
                                this.res.redirect(this.router.build('staff.reserve.confirm', {token: token}));
                            });

                        } else {
                            this.next(new Error('不適切なアクセスです'));
                        }

                    },
                    error: (form) => {
                        this.res.redirect(this.router.build('staff.reserve.tickets', {token: token}));
                    },
                    empty: (form) => {
                        this.res.redirect(this.router.build('staff.reserve.tickets', {token: token}));
                    }
                });
            } else {
                this.res.render('staff/reserve/tickets', {
                    layout: 'layouts/staff/layout',
                    form: staffReserveTicketForm.form,
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

            if (this.req.method === 'POST') {
                this.res.redirect(this.router.build('staff.reserve.process', {token: token}));
            } else {
                this.res.render('staff/reserve/confirm', {
                    layout: 'layouts/staff/layout',
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
                // 予約番号発行
                reservationModel.paymentNo = Util.createPaymentNo();

                // 予約情報セッション削除
                this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(() => {
                    if (err) {

                    } else {
                        // DB保存
                        // 予約ステータス更新
                        let reservedDocuments: Array<mongoose.Document> = [];

                        let promises = [];
                        reservationModel.reservationIds.forEach((reservationId, index) => {
                            let reservation = reservationModel.getReservation(reservationId);

                            promises.push(new Promise((resolve, reject) => {

                                this.logger.debug('updating reservation status to STATUS_RESERVED..._id:', reservationId);
                                Models.Reservation.findOneAndUpdate(
                                    {
                                        _id: reservationId,
                                    },
                                    {
                                        payment_no: reservationModel.paymentNo,
                                        status: ReservationUtil.STATUS_RESERVED,
                                        performance: reservationModel.performance._id,
                                        performance_day: reservationModel.performance.day,
                                        performance_start_time: reservationModel.performance.start_time,
                                        performance_end_time: reservationModel.performance.end_time,
                                        theater: reservationModel.performance.theater._id,
                                        theater_name: reservationModel.performance.theater.name,
                                        screen: reservationModel.performance.screen._id,
                                        screen_name: reservationModel.performance.screen.name,
                                        film: reservationModel.performance.film._id,
                                        film_name: reservationModel.performance.film.name,
                                        ticket_type: reservation.ticket_type,
                                        ticket_name: reservation.ticket_name,
                                        ticket_name_en: reservation.ticket_name_en,
                                        ticket_price: reservation.ticket_price,
                                        watcher_name: reservation.watcher_name,
                                        staff: this.staffUser.get('_id'),
                                        staff_user_id: this.staffUser.get('user_id'),
                                        staff_name: this.staffUser.get('name'),
                                        staff_email: this.staffUser.get('email'),
                                        staff_department_name: this.staffUser.get('department_name'),
                                        staff_tel: this.staffUser.get('tel'),
                                        staff_signature: this.staffUser.get('signature'),
                                        created_user: this.constructor.toString(),
                                        updated_user: this.constructor.toString(),
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
                        });

                        Promise.all(promises).then(() => {

                            // TODO 予約できていない在庫があった場合
                            if (reservationModel.reservationIds.length > reservedDocuments.length) {
                                this.res.redirect(this.router.build('staff.reserve.confirm', {token: token}));
                            } else {
                                // 予約結果セッションを保存して、完了画面へ
                                let reservationResultModel = reservationModel.toReservationResult();

                                this.logger.debug('saving reservationResult...', reservationResultModel);
                                reservationResultModel.save((err) => {
                                    this.res.redirect(this.router.build('staff.reserve.complete', {token: token}));
                                });
                            }

                        }, (err) => {
                            // TODO 万が一の対応どうするか
                            this.next(err);
                        });

                    }
                });
            }
        });
    }

    public complete(): void {
        let token = this.req.params.token;
        ReservationResultModel.find(token, (err, reservationResultModel) => {
            if (err || reservationResultModel === null) {
                return this.next(new Error('予約プロセスが中断されました'));
            }

            this.res.render('staff/reserve/complete', {
                layout: 'layouts/staff/layout',
                reservationResultModel: reservationResultModel,
            });
        });
    }
}
