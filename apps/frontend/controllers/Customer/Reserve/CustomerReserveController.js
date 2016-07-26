"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ReserveBaseController_1 = require('../../ReserveBaseController');
var Util_1 = require('../../../../common/Util/Util');
var reserveTermsForm_1 = require('../../../forms/Reserve/reserveTermsForm');
var reservePerformanceForm_1 = require('../../../forms/Reserve/reservePerformanceForm');
var reserveSeatForm_1 = require('../../../forms/Reserve/reserveSeatForm');
var reserveTicketForm_1 = require('../../../forms/Reserve/reserveTicketForm');
var reserveProfileForm_1 = require('../../../forms/Reserve/reserveProfileForm');
var ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
var FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
var ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
var ReservationResultModel_1 = require('../../../models/Reserve/ReservationResultModel');
var CustomerReserveController = (function (_super) {
    __extends(CustomerReserveController, _super);
    function CustomerReserveController() {
        _super.apply(this, arguments);
    }
    /**
     * 規約
     */
    CustomerReserveController.prototype.terms = function () {
        var _this = this;
        if (this.req.method === 'POST') {
            var form = reserveTermsForm_1.default(this.req);
            form(this.req, this.res, function (err) {
                if (_this.req.form.isValid) {
                    _this.res.redirect(_this.router.build('customer.reserve.start', {}));
                }
                else {
                    _this.res.render('customer/reserve/terms', {});
                }
            });
        }
        else {
            this.res.render('customer/reserve/terms', {});
        }
    };
    CustomerReserveController.prototype.start = function () {
        // TODO 内部以外は、上映開始20分過ぎていたらはじく
        var _this = this;
        // 予約トークンを発行
        var token = Util_1.default.createToken();
        var reservationModel = new ReservationModel_1.default();
        reservationModel.token = token;
        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save(function (err) {
            _this.res.redirect(_this.router.build('customer.reserve.performances', { token: token }));
        });
    };
    /**
     * スケジュール選択
     */
    CustomerReserveController.prototype.performances = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
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
                                    _this.res.redirect(_this.router.build('customer.reserve.seats', { token: token }));
                                });
                            }
                        });
                    }
                    else {
                        _this.res.render('customer/reserve/performances', {});
                    }
                });
            }
            else {
                // 仮予約あればキャンセルする
                _this.processCancelSeats(reservationModel, function (err, reservationModel) {
                    _this.logger.debug('saving reservationModel... ', reservationModel);
                    reservationModel.save(function (err) {
                        _this.res.render('customer/reserve/performances', {
                            FilmUtil: FilmUtil_1.default
                        });
                    });
                });
            }
        });
    };
    /**
     * 座席選択
     *
     * TODO 一アカウント、一パフォーマンスにつき4枚まで
     */
    CustomerReserveController.prototype.seats = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (_this.req.method === 'POST') {
                reserveSeatForm_1.default(_this.req, _this.res, function (err) {
                    if (_this.req.form.isValid) {
                        var reservationIds_1 = JSON.parse(_this.req.form['reservationIds']);
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
                                        _this.res.redirect(_this.router.build('customer.reserve.seats', { token: token }) + ("?message=" + encodeURIComponent(message)));
                                    }
                                    else {
                                        _this.res.redirect(_this.router.build('customer.reserve.tickets', { token: token }));
                                    }
                                });
                            }
                        });
                    }
                    else {
                        _this.res.redirect(_this.router.build('customer.reserve.seats', { token: token }));
                    }
                });
            }
            else {
                _this.res.render('customer/reserve/seats', {
                    reservationModel: reservationModel,
                });
            }
        });
    };
    /**
     * 券種選択
     */
    CustomerReserveController.prototype.tickets = function () {
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
                                reservationModel.setReservation(reservation._id, reservation);
                            });
                            _this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save(function (err) {
                                _this.res.redirect(_this.router.build('customer.reserve.profile', { token: token }));
                            });
                        }
                        else {
                            _this.next(new Error('不適切なアクセスです'));
                        }
                    }
                    else {
                        _this.res.redirect(_this.router.build('customer.reserve.tickets', { token: token }));
                    }
                });
            }
            else {
                _this.res.render('customer/reserve/tickets', {
                    reservationModel: reservationModel,
                });
            }
        });
    };
    /**
     * 購入者情報
     */
    CustomerReserveController.prototype.profile = function () {
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
                            tel: _this.req.form['tel']
                        };
                        _this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save(function (err) {
                            _this.res.redirect(_this.router.build('customer.reserve.confirm', { token: token }));
                        });
                    }
                    else {
                        _this.res.render('customer/reserve/profile', {
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
                if (process.env.NODE_ENV === 'dev') {
                    _this.res.locals.lastName = 'てすとせい';
                    _this.res.locals.firstName = 'てすとめい';
                    _this.res.locals.tel = '09012345678';
                    _this.res.locals.email = 'ilovegadd@gmail.com';
                    _this.res.locals.emailConfirm = 'ilovegadd';
                    _this.res.locals.emailConfirmDomain = 'gmail.com';
                }
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
                _this.res.render('customer/reserve/profile', {
                    reservationModel: reservationModel,
                });
            }
        });
    };
    /**
     * 予約内容確認
     */
    CustomerReserveController.prototype.confirm = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (_this.req.method === 'POST') {
                _this.res.redirect(_this.router.build('gmo.reserve.start', { token: token }));
            }
            else {
                _this.res.render('customer/reserve/confirm', {
                    reservationModel: reservationModel,
                    ReservationUtil: ReservationUtil_1.default
                });
            }
        });
    };
    CustomerReserveController.prototype.waitingSettlement = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.res.render('customer/reserve/waitingSettlement', {
                reservationModel: reservationModel,
            });
        });
    };
    CustomerReserveController.prototype.complete = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationResultModel_1.default.find(token, function (err, reservationResultModel) {
            if (err || reservationResultModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.res.render('customer/reserve/complete', {
                reservationResultModel: reservationResultModel
            });
        });
    };
    return CustomerReserveController;
}(ReserveBaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CustomerReserveController;
