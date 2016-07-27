"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ReserveBaseController_1 = require('../../ReserveBaseController');
var MemberUser_1 = require('../../../models/User/MemberUser');
var Util_1 = require('../../../../common/Util/Util');
var memberReserveLoginForm_1 = require('../../../forms/Member/Reserve/memberReserveLoginForm');
var reserveTicketForm_1 = require('../../../forms/Reserve/reserveTicketForm');
var reserveProfileForm_1 = require('../../../forms/Reserve/reserveProfileForm');
var Models_1 = require('../../../../common/models/Models');
var ReservationUtil_1 = require('../../../../common/models/Reservation/ReservationUtil');
var ReservationModel_1 = require('../../../models/Reserve/ReservationModel');
var ReservationResultModel_1 = require('../../../models/Reserve/ReservationResultModel');
var MemberReserveController = (function (_super) {
    __extends(MemberReserveController, _super);
    function MemberReserveController() {
        _super.apply(this, arguments);
    }
    /**
     * 規約
     * TODO 期限指定(固定日で)
     */
    MemberReserveController.prototype.terms = function () {
        var _this = this;
        // ログイン中であればプロセス開始
        if (this.memberUser.isAuthenticated()) {
            return this.res.redirect(this.router.build('member.reserve.start', {}));
        }
        if (this.req.method === 'POST') {
            memberReserveLoginForm_1.default(this.req, this.res, function (err) {
                if (_this.req.form.isValid) {
                    // ユーザー認証
                    _this.logger.debug('finding member... user_id:', _this.req.form['user_id']);
                    Models_1.default.Member.findOne({
                        user_id: _this.req.form['user_id'],
                        password: _this.req.form['password'],
                    }, function (err, memberDocument) {
                        if (err || memberDocument === null) {
                            _this.res.render('member/reserve/terms', {});
                        }
                        else {
                            // ログイン
                            _this.logger.debug('logining...memberDocument:', memberDocument);
                            _this.req.session[MemberUser_1.default.AUTH_SESSION_NAME] = memberDocument;
                            _this.res.redirect(_this.router.build('member.reserve.start', {}));
                        }
                    });
                }
                else {
                    _this.res.render('member/reserve/terms', {});
                }
            });
        }
        else {
            this.res.locals.userId = '';
            this.res.locals.password = '';
            this.res.render('member/reserve/terms', {});
        }
    };
    MemberReserveController.prototype.start = function () {
        var _this = this;
        // 予約状況を確認
        this.logger.debug('checking reservation status... member:', this.memberUser.get('_id'));
        Models_1.default.Reservation.find({
            member: this.memberUser.get('_id'),
            status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER
        }, {}, {}, function (err, reservationDocuments) {
            // 確保中のメルマガ当選者席がなければ終了
            if (err || reservationDocuments.length < 1) {
                _this.next(new Error('すでに予約済みです'));
            }
            else {
                // 予約トークンを発行
                var token_1 = Util_1.default.createToken();
                var reservationModel = new ReservationModel_1.default();
                reservationModel.token = token_1;
                reservationModel.member = {
                    _id: _this.memberUser.get('_id'),
                    user_id: _this.memberUser.get('user_id')
                };
                // パフォーマンスFIX
                _this.processFixPerformance(reservationModel, _this.memberUser.get('performance'), function (err, reservationModel) {
                    if (err) {
                        _this.next(err);
                    }
                    else {
                        // 確保中の座席指定情報を追加
                        for (var _i = 0, reservationDocuments_1 = reservationDocuments; _i < reservationDocuments_1.length; _i++) {
                            var reservationDocument = reservationDocuments_1[_i];
                            reservationModel.reservationIds.push(reservationDocument.get('_id'));
                            reservationModel.setReservation(reservationDocument.get('_id'), {
                                token: token_1,
                                _id: reservationDocument.get('_id'),
                                status: reservationDocument.get('status'),
                                seat_code: reservationDocument.get('seat_code'),
                                performance: _this.memberUser.get('performance'),
                            });
                        }
                        // パフォーマンスと座席指定した状態で券種選択へ
                        _this.logger.debug('saving reservationModel... ', reservationModel);
                        reservationModel.save(function (err) {
                            _this.res.redirect(_this.router.build('member.reserve.tickets', { token: token_1 }));
                        });
                    }
                });
            }
        });
    };
    /**
     * 券種選択
     */
    MemberReserveController.prototype.tickets = function () {
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
                            choices.forEach(function (choice, index) {
                                var reservation = reservationModel.getReservation(choice.reservation_id);
                                reservation.ticket_type = choice.ticket_type;
                                reservation.ticket_name = choice.ticket_name;
                                reservation.ticket_name_en = choice.ticket_name_en;
                                reservation.ticket_price = choice.ticket_price;
                                reservationModel.setReservation(reservation._id, reservation);
                            });
                            _this.logger.debug('saving reservationModel... ', reservationModel);
                            reservationModel.save(function (err) {
                                _this.res.redirect(_this.router.build('member.reserve.profile', { token: token }));
                            });
                        }
                        else {
                            _this.next(new Error('不適切なアクセスです'));
                        }
                    }
                    else {
                        _this.res.redirect(_this.router.build('member.reserve.tickets', { token: token }));
                    }
                });
            }
            else {
                _this.res.render('member/reserve/tickets', {
                    reservationModel: reservationModel,
                });
            }
        });
    };
    /**
     * 購入者情報
     */
    MemberReserveController.prototype.profile = function () {
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
                            _this.res.redirect(_this.router.build('member.reserve.confirm', { token: token }));
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
                _this.res.render('member/reserve/profile', {
                    reservationModel: reservationModel,
                });
            }
        });
    };
    /**
     * 予約内容確認
     */
    MemberReserveController.prototype.confirm = function () {
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
                _this.res.render('member/reserve/confirm', {
                    reservationModel: reservationModel
                });
            }
        });
    };
    MemberReserveController.prototype.waitingSettlement = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.res.render('member/reserve/waitingSettlement', {
                reservationModel: reservationModel,
            });
        });
    };
    /**
     * complete reservation
     * TODO force to logout
     * TODO 固定日時を経過したら、空席ステータスにするバッチ
     */
    MemberReserveController.prototype.complete = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationResultModel_1.default.find(token, function (err, reservationResultModel) {
            if (err || reservationResultModel === null) {
                return _this.next(new Error('予約プロセスが中断されました'));
            }
            _this.res.render('member/reserve/complete', {
                reservationResultModel: reservationResultModel,
            });
        });
    };
    return MemberReserveController;
}(ReserveBaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MemberReserveController;
