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
var Models_1 = require('../../../../common/models/Models');
var FilmUtil_1 = require('../../../../common/models/Film/FilmUtil');
var ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
var ReservationResultModel_1 = require('../../../models/Reserve/ReservationResultModel');
var StaffReserveController = (function (_super) {
    __extends(StaffReserveController, _super);
    function StaffReserveController() {
        _super.apply(this, arguments);
    }
    StaffReserveController.prototype.start = function () {
        var _this = this;
        // 予約トークンを発行
        var token = Util_1.default.createToken();
        var reservationModel = new ReservationModel_1.default();
        reservationModel.token = token;
        reservationModel.staff = {
            _id: this.staffUser.get('_id'),
            user_id: this.staffUser.get('user_id'),
            name: this.staffUser.get('name'),
            email: this.staffUser.get('email'),
            department_name: this.staffUser.get('department_name'),
            tel: this.staffUser.get('tel'),
            signature: this.staffUser.get('signature'),
        };
        // スケジュール選択へ
        this.logger.debug('saving reservationModel... ', reservationModel);
        reservationModel.save(function (err) {
            _this.res.redirect(_this.router.build('staff.reserve.performances', { token: token }));
        });
    };
    /**
     * スケジュール選択
     */
    StaffReserveController.prototype.performances = function () {
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
                                    _this.res.redirect(_this.router.build('staff.reserve.seats', { token: token }));
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
                        _this.res.render('staff/reserve/performances', {
                            layout: 'layouts/staff/layout',
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
     * TODO 1パフォーマンスにつき何件まで？？？
     */
    StaffReserveController.prototype.seats = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            // 外部関係者による予約数を取得
            Models_1.default.Reservation.count({
                staff: _this.staffUser.get('_id')
            }, function (err, reservationsCount) {
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
                                        // 仮押さえできていない在庫があった場合
                                        if (reservationIds_1.length > reservationModel.reservationIds.length) {
                                            // TODO メッセージ？
                                            var message = '座席を確保できませんでした。再度指定してください。';
                                            _this.res.redirect(_this.router.build('staff.reserve.seats', { token: token }) + ("?message=" + encodeURIComponent(message)));
                                        }
                                        else {
                                            _this.res.redirect(_this.router.build('staff.reserve.tickets', { token: token }));
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            _this.res.redirect(_this.router.build('staff.reserve.seats', { token: token }));
                        }
                    });
                }
                else {
                    _this.res.render('staff/reserve/seats', {
                        layout: 'layouts/staff/layout',
                        reservationModel: reservationModel,
                    });
                }
            });
        });
    };
    /**
     * 券種選択
     */
    StaffReserveController.prototype.tickets = function () {
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
                                reservation.ticket_type_code = choice.ticket_type_code;
                                reservation.ticket_type_name = choice.ticket_type_name;
                                reservation.ticket_type_name_en = choice.ticket_type_name_en;
                                reservation.ticket_type_charge = parseInt(choice.ticket_type_charge);
                                reservation.watcher_name = choice.watcher_name;
                                reservationModel.setReservation(reservation._id, reservation);
                            });
                            _this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save(function (err) {
                                _this.res.redirect(_this.router.build('staff.reserve.confirm', { token: token }));
                            });
                        }
                        else {
                            _this.next(new Error('不適切なアクセスです'));
                        }
                    }
                    else {
                        _this.res.redirect(_this.router.build('staff.reserve.tickets', { token: token }));
                    }
                });
            }
            else {
                _this.res.render('staff/reserve/tickets', {
                    layout: 'layouts/staff/layout',
                    reservationModel: reservationModel,
                });
            }
        });
    };
    /**
     * 予約内容確認
     */
    StaffReserveController.prototype.confirm = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.logger.debug('reservationModel is ', reservationModel.toLog());
            if (_this.req.method === 'POST') {
                _this.res.redirect(_this.router.build('staff.reserve.process', { token: token }));
            }
            else {
                _this.res.render('staff/reserve/confirm', {
                    layout: 'layouts/staff/layout',
                    reservationModel: reservationModel
                });
            }
        });
    };
    StaffReserveController.prototype.process = function () {
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
                                        _this.res.redirect(_this.router.build('staff.reserve.confirm', { token: token }));
                                    }
                                    else {
                                        // 予約結果セッションを保存して、完了画面へ
                                        var reservationResultModel = reservationModel.toReservationResult();
                                        _this.logger.info('saving reservationResult...', reservationResultModel.toLog());
                                        reservationResultModel.save(function (err) {
                                            _this.logger.info('redirecting to complete...');
                                            _this.res.redirect(_this.router.build('staff.reserve.complete', { token: token }));
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
    StaffReserveController.prototype.complete = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationResultModel_1.default.find(token, function (err, reservationResultModel) {
            if (err || reservationResultModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.res.render('staff/reserve/complete', {
                layout: 'layouts/staff/layout',
                reservationResultModel: reservationResultModel,
            });
        });
    };
    return StaffReserveController;
}(ReserveBaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StaffReserveController;
