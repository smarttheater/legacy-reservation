"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ReserveBaseController_1 = require('../../ReserveBaseController');
var Util_1 = require('../../../../common/Util/Util');
var reservePerformanceForm_1 = require('../../../forms/Reserve/reservePerformanceForm');
var reserveSeatForm_1 = require('../../../forms/Reserve/reserveSeatForm');
var reserveTicketForm_1 = require('../../../forms/Reserve/reserveTicketForm');
var reserveProfileForm_1 = require('../../../forms/Reserve/reserveProfileForm');
var Models_1 = require('../../../../common/models/Models');
var FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
var ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
var ReservationResultModel_1 = require('../../../models/Reserve/ReservationResultModel');
var SponsorReserveController = (function (_super) {
    __extends(SponsorReserveController, _super);
    function SponsorReserveController() {
        _super.apply(this, arguments);
    }
    SponsorReserveController.prototype.start = function () {
        var _this = this;
        // 予約トークンを発行
        var token = Util_1.default.createToken();
        var reservationModel = new ReservationModel_1.default();
        reservationModel.token = token;
        reservationModel.sponsor = {
            _id: this.sponsorUser.get('_id'),
            user_id: this.sponsorUser.get('user_id'),
            name: this.sponsorUser.get('name'),
            email: this.sponsorUser.get('email'),
        };
        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save(function (err) {
            _this.res.redirect(_this.router.build('sponsor.reserve.performances', { token: token }));
        });
    };
    /**
     * スケジュール選択
     */
    SponsorReserveController.prototype.performances = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            if (_this.req.method === 'POST') {
                reservePerformanceForm_1.default(_this.req, _this.res, function (err) {
                    if (_this.req.form.isValid) {
                        // パフォーマンスFIX
                        _this.processFixPerformance(reservationModel, _this.req.form['performanceId'], function (err, reservationModel) {
                            if (err) {
                                _this.next(err);
                            }
                            else {
                                _this.logger.debug('saving reservationModel... ', reservationModel);
                                reservationModel.save(function (err) {
                                    _this.res.redirect(_this.router.build('sponsor.reserve.seats', { token: token }));
                                });
                            }
                        });
                    }
                    else {
                        _this.next(new Error('不適切なアクセスです'));
                    }
                });
            }
            else {
                // 仮予約あればキャンセルする
                _this.processCancelSeats(reservationModel, function (err, reservationModel) {
                    _this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save(function (err) {
                        _this.res.render('sponsor/reserve/performances', {
                            layout: 'layouts/sponsor/layout',
                            FilmUtil: FilmUtil_1.default
                        });
                    });
                });
            }
        });
    };
    /**
     * 座席選択
     */
    SponsorReserveController.prototype.seats = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            // 外部関係者による予約数を取得
            Models_1.default.Reservation.count({
                sponsor: _this.sponsorUser.get('_id')
            }, function (err, reservationsCount) {
                if (_this.req.method === 'POST') {
                    reserveSeatForm_1.default(_this.req, _this.res, function (err) {
                        if (_this.req.form.isValid) {
                            var reservationIds_1 = JSON.parse(_this.req.form['reservationIds']);
                            // 座席指定可能数チェック
                            if (reservationIds_1.length > parseInt(_this.sponsorUser.get('max_reservation_count')) - reservationsCount) {
                                var message = '座席指定可能枚数を超えました。';
                                return _this.res.redirect(_this.router.build('sponsor.reserve.seats', { token: token }) + ("?message=" + encodeURIComponent(message)));
                            }
                            // 座席FIX
                            _this.processFixSeats(reservationModel, reservationIds_1, function (err, reservationModel) {
                                if (err) {
                                    _this.next(err);
                                }
                                else {
                                    _this.logger.debug('saving reservationModel... ', reservationModel);
                                    reservationModel.save(function (err) {
                                        // 仮予約に失敗した座席コードがあった場合
                                        if (reservationIds_1.length > reservationModel.reservationIds.length) {
                                            // TODO メッセージ？
                                            var message = '座席を確保できませんでした。再度指定してください。';
                                            _this.res.redirect(_this.router.build('sponsor.reserve.seats', { token: token }) + ("?message=" + encodeURIComponent(message)));
                                        }
                                        else {
                                            _this.res.redirect(_this.router.build('sponsor.reserve.tickets', { token: token }));
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            _this.res.redirect(_this.router.build('sponsor.reserve.seats', { token: token }));
                        }
                    });
                }
                else {
                    _this.res.render('sponsor/reserve/seats', {
                        layout: 'layouts/sponsor/layout',
                        reservationModel: reservationModel,
                        reservationsCount: reservationsCount,
                    });
                }
            });
        });
    };
    /**
     * 券種選択
     */
    SponsorReserveController.prototype.tickets = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (_this.req.method === 'POST') {
                reserveTicketForm_1.default(_this.req, _this.res, function (err) {
                    if (_this.req.form.isValid) {
                        // 座席選択情報を保存して座席選択へ
                        var choices = JSON.parse(_this.req.form['choices']);
                        if (Array.isArray(choices)) {
                            choices.forEach(function (choice) {
                                var reservation = reservationModel.getReservation(choice.reservation_id);
                                reservation.ticket_type = choice.ticket_type;
                                reservation.ticket_name = choice.ticket_name;
                                reservation.ticket_name_en = choice.ticket_name_en;
                                reservation.ticket_price = choice.ticket_price;
                                reservation.watcher_name = choice.watcher_name;
                                reservationModel.setReservation(reservation._id, reservation);
                            });
                            _this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save(function (err) {
                                _this.res.redirect(_this.router.build('sponsor.reserve.profile', { token: token }));
                            });
                        }
                        else {
                            _this.next(new Error('不適切なアクセスです'));
                        }
                    }
                    else {
                        _this.res.redirect(_this.router.build('sponsor.reserve.tickets', { token: token }));
                    }
                });
            }
            else {
                _this.res.render('sponsor/reserve/tickets', {
                    layout: 'layouts/sponsor/layout',
                    reservationModel: reservationModel,
                });
            }
        });
    };
    /**
     * 購入者情報
     */
    SponsorReserveController.prototype.profile = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (_this.req.method === 'POST') {
                var form = reserveProfileForm_1.default(_this.req);
                form(_this.req, _this.res, function (err) {
                    if (_this.req.form.isValid) {
                        // 購入者情報を保存して座席選択へ
                        reservationModel.profile = {
                            last_name: _this.req.form['lastName'],
                            first_name: _this.req.form['firstName'],
                            email: _this.req.form['email'],
                            tel: _this.req.form['tel'],
                        };
                        _this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save(function (err) {
                            _this.res.redirect(_this.router.build('sponsor.reserve.confirm', { token: token }));
                        });
                    }
                    else {
                        _this.res.render('sponsor/reserve/profile', {
                            layout: 'layouts/sponsor/layout',
                            reservationModel: reservationModel,
                        });
                    }
                });
            }
            else {
                _this.res.locals.lastName = '';
                _this.res.locals.firstName = '';
                _this.res.locals.tel = '';
                _this.res.locals.email = '';
                _this.res.locals.emailConfirm = '';
                _this.res.locals.emailConfirmDomain = '';
                // セッションに情報があれば、フォーム初期値設定
                if (reservationModel.profile) {
                    var email = reservationModel.profile.email;
                    _this.res.locals.lastName = reservationModel.profile.last_name;
                    _this.res.locals.firstName = reservationModel.profile.first_name;
                    _this.res.locals.tel = reservationModel.profile.tel;
                    _this.res.locals.email = email;
                    _this.res.locals.emailConfirm = email.substr(0, email.indexOf('@'));
                    _this.res.locals.emailConfirmDomain = email.substr(email.indexOf('@') + 1);
                }
                _this.res.render('sponsor/reserve/profile', {
                    layout: 'layouts/sponsor/layout',
                    reservationModel: reservationModel,
                });
            }
        });
    };
    /**
     * 予約内容確認
     */
    SponsorReserveController.prototype.confirm = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (_this.req.method === 'POST') {
                _this.res.redirect(_this.router.build('sponsor.reserve.process', { token: token }));
            }
            else {
                _this.res.render('sponsor/reserve/confirm', {
                    layout: 'layouts/sponsor/layout',
                    reservationModel: reservationModel
                });
            }
        });
    };
    SponsorReserveController.prototype.process = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (_this.req.method === 'POST') {
            }
            else {
                // 予約情報セッション削除
                _this.logger.debug('removing reservationModel... ', reservationModel);
                reservationModel.remove(function () {
                    if (err) {
                    }
                    else {
                        // ここで予約番号発行
                        reservationModel.paymentNo = Util_1.default.createPaymentNo();
                        // 予約プロセス固有のログファイルをセット
                        _this.setProcessLogger(reservationModel.paymentNo, function () {
                            _this.logger.info('paymentNo published. paymentNo:', reservationModel.paymentNo);
                            _this.logger.info('fixing all...');
                            _this.processFixAll(reservationModel, function (err, reservationModel) {
                                if (err) {
                                    // TODO 万が一の対応どうするか
                                    _this.next(err);
                                }
                                else {
                                    // TODO 予約できていない在庫があった場合
                                    if (reservationModel.reservationIds.length > reservationModel.reservedDocuments.length) {
                                        _this.res.redirect(_this.router.build('sponsor.reserve.confirm', { token: token }));
                                    }
                                    else {
                                        // 予約結果セッションを保存して、完了画面へ
                                        var reservationResultModel = reservationModel.toReservationResult();
                                        _this.logger.info('saving reservationResult...', reservationResultModel.toLog());
                                        reservationResultModel.save(function (err) {
                                            _this.logger.info('redirecting to complete...');
                                            _this.res.redirect(_this.router.build('sponsor.reserve.complete', { token: token }));
                                        });
                                    }
                                }
                            });
                        });
                    }
                });
            }
        });
    };
    SponsorReserveController.prototype.complete = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationResultModel_1.default.find(token, function (err, reservationResultModel) {
            if (err || reservationResultModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.res.render('sponsor/reserve/complete', {
                layout: 'layouts/sponsor/layout',
                reservationResultModel: reservationResultModel,
            });
        });
    };
    return SponsorReserveController;
}(ReserveBaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorReserveController;
