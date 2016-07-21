"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('./BaseController');
var Models_1 = require('../../common/models/Models');
var ReservationUtil_1 = require('../../common/models/Reservation/ReservationUtil');
var log4js = require('log4js');
var fs = require('fs-extra');
var sendgrid = require('sendgrid');
var conf = require('config');
/**
 * 予約フローベースコントローラー
 */
var ReserveBaseController = (function (_super) {
    __extends(ReserveBaseController, _super);
    function ReserveBaseController() {
        _super.apply(this, arguments);
    }
    ReserveBaseController.prototype.processCancelSeats = function (reservationModel, cb) {
        var _this = this;
        var reservationIdsInSession = (reservationModel.reservationIds) ? reservationModel.reservationIds : [];
        var promises = [];
        // セッション中の予約リストを初期化
        reservationModel.reservationIds = [];
        // 仮予約を空席ステータスに戻す
        reservationIdsInSession.forEach(function (reservationIdInSession, index) {
            promises.push(new Promise(function (resolve, reject) {
                _this.logger.debug('updating reservation status to avalilable..._id:', reservationIdInSession);
                Models_1.default.Reservation.update({
                    _id: reservationIdInSession,
                }, {
                    status: ReservationUtil_1.default.STATUS_AVAILABLE,
                }, function (err, affectedRows) {
                    // 失敗したとしても時間経過で消えるので放置
                    if (err) {
                    }
                    else {
                    }
                    resolve();
                });
            }));
        });
        Promise.all(promises).then(function () {
            cb(null, reservationModel);
        }, function (err) {
            cb(err, reservationModel);
        });
    };
    /**
     * パフォーマンスをFIXするプロセス
     * パフォーマンスIDから、パフォーマンスを検索し、その後プロセスに必要な情報をreservationModelに追加する
     */
    ReserveBaseController.prototype.processFixPerformance = function (reservationModel, perfomanceId, cb) {
        // パフォーマンス取得
        this.logger.debug('searching performance... id:', perfomanceId);
        Models_1.default.Performance.findOne({
            _id: perfomanceId
        }, 'day start_time end_time film screen theater' // 必要な項目だけ指定すること
        )
            .populate('film', 'name name_en') // 必要な項目だけ指定すること
            .populate('screen', 'name name_en sections') // 必要な項目だけ指定すること
            .populate('theater', 'name name_en') // 必要な項目だけ指定すること
            .exec(function (err, performanceDocument) {
            if (err) {
                cb(err, reservationModel);
            }
            else {
                reservationModel.reservationIds = [];
                // 座席コードごとの券種選択肢リスト
                // TODO ここが、予約する主体によって異なってくる
                // それをどう実装するか
                var ticketChoicesBySeatCode = {};
                var seatDocuments = performanceDocument.get('screen').get('sections')[0].get('seats');
                // 内部関係者の場合
                if (reservationModel.staff) {
                    for (var _i = 0, seatDocuments_1 = seatDocuments; _i < seatDocuments_1.length; _i++) {
                        var seatDocument = seatDocuments_1[_i];
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
                }
                else if (reservationModel.sponsor) {
                    for (var _a = 0, seatDocuments_2 = seatDocuments; _a < seatDocuments_2.length; _a++) {
                        var seatDocument = seatDocuments_2[_a];
                        // TODO 外部関係者の場合、ひとまず券種リストを固定にしておく
                        // ticketChoicesBySeatCode[seatDocument.get('code')] = seatDocument.get('tickets');
                        ticketChoicesBySeatCode[seatDocument.get('code')] = [
                            {
                                type: '01',
                                name: '一般',
                                name_en: 'adult',
                                price: 1500,
                            }
                        ];
                    }
                    reservationModel.ticketChoicesBySeatCode = ticketChoicesBySeatCode;
                }
                else {
                    for (var _b = 0, seatDocuments_3 = seatDocuments; _b < seatDocuments_3.length; _b++) {
                        var seatDocument = seatDocuments_3[_b];
                        // TODO いったん固定
                        // ticketChoicesBySeatCode[seatDocument.get('code')] = seatDocument.get('tickets');
                        ticketChoicesBySeatCode[seatDocument.get('code')] = [
                            {
                                type: '01',
                                name: '一般',
                                name_en: 'adult',
                                price: 1500,
                            },
                            {
                                type: '02',
                                name: '小人',
                                name_en: 'child',
                                price: 900,
                            }
                        ];
                    }
                    reservationModel.ticketChoicesBySeatCode = ticketChoicesBySeatCode;
                }
                // パフォーマンス情報を保管
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
                // スクリーン座席表HTMLを保管
                // TODO ひとまず固定だが、最終的にはパフォーマンスに応じて適切なスクリーンを入れる
                fs.readFile(__dirname + "/../views/screens/map.ejs", 'utf8', function (err, data) {
                    reservationModel.screenHtml = data;
                    cb(null, reservationModel);
                });
            }
        });
    };
    /**
     * 座席をFIXするプロセス
     */
    ReserveBaseController.prototype.processFixSeats = function (reservationModel, reservationIds, cb) {
        var _this = this;
        var reservationIdsInSession = reservationModel.reservationIds;
        if (reservationIds.length < 1) {
            cb(new Error('座席が選択されていません'), reservationModel);
        }
        else {
            // 仮押さえ
            // まず仮押さえしてから、仮押さえキャンセル
            var promises_1 = [];
            // セッション中の予約リストを初期化
            reservationModel.reservationIds = [];
            // 仮予約解除の場合、空席ステータスに戻す(redis中の情報にあって、新たな指定リストにない座席コード)
            reservationIdsInSession.forEach(function (reservationIdInSession, index) {
                var reservation = reservationModel.getReservation(reservationIdInSession);
                if (reservationIds.indexOf(reservationIdInSession) >= 0) {
                }
                else {
                    promises_1.push(new Promise(function (resolve, reject) {
                        _this.logger.debug('updating reservation status to avalilable..._id:', reservationIdInSession);
                        Models_1.default.Reservation.update({
                            _id: reservationIdInSession,
                        }, {
                            status: ReservationUtil_1.default.STATUS_AVAILABLE,
                        }, function (err, affectedRows) {
                            // 失敗したとしても時間経過で消えるので放置
                            if (err) {
                            }
                            else {
                            }
                            resolve();
                        });
                    }));
                }
            });
            // 新たな座席指定と、既に仮予約済みの座席コードについて
            reservationIds.forEach(function (reservationId, index) {
                // すでに仮予約済みであれば、セッションに加えるだけ
                if (reservationIdsInSession.indexOf(reservationId) >= 0) {
                    promises_1.push(new Promise(function (resolve, reject) {
                        reservationModel.reservationIds.push(reservationId);
                        resolve();
                    }));
                }
                else {
                    // 新規仮予約
                    promises_1.push(new Promise(function (resolve, reject) {
                        var update = {
                            status: ReservationUtil_1.default.STATUS_TEMPORARY
                        };
                        if (reservationModel.staff) {
                            update['staff'] = reservationModel.staff._id;
                        }
                        else if (reservationModel.sponsor) {
                            update['sponsor'] = reservationModel.sponsor._id;
                        }
                        else if (reservationModel.member) {
                            update['member'] = reservationModel.member._id;
                        }
                        else {
                        }
                        _this.logger.debug('updating reservation status to temporary...reservationId:', reservationId);
                        Models_1.default.Reservation.findOneAndUpdate({
                            _id: reservationId,
                            status: ReservationUtil_1.default.STATUS_AVAILABLE // 空席ステータスのみ、新規仮登録できる(ここはポイントなので要注意！！！)
                        }, update, {
                            new: true,
                        }, function (err, reservationDocument) {
                            if (err) {
                            }
                            else {
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
            Promise.all(promises_1).then(function () {
                cb(null, reservationModel);
            }, function (err) {
                cb(err, reservationModel);
            });
        }
    };
    /**
     * 予約全体をFIXするプロセス
     */
    ReserveBaseController.prototype.processFixAll = function (reservationModel, cb) {
        var _this = this;
        reservationModel.reservedDocuments = [];
        var promises = [];
        reservationModel.reservationIds.forEach(function (reservationId, index) {
            var reservation = reservationModel.getReservation(reservationId);
            promises.push(new Promise(function (resolve, reject) {
                _this.logger.info('updating reservation status to STATUS_RESERVED..._id:', reservationId);
                Models_1.default.Reservation.findOneAndUpdate({
                    _id: reservationId,
                }, {
                    payment_no: reservationModel.paymentNo,
                    status: ReservationUtil_1.default.STATUS_RESERVED,
                    performance: reservationModel.performance._id,
                    performance_day: reservationModel.performance.day,
                    performance_start_time: reservationModel.performance.start_time,
                    performance_end_time: reservationModel.performance.end_time,
                    theater: reservationModel.performance.theater._id,
                    theater_name: reservationModel.performance.theater.name,
                    theater_name_en: reservationModel.performance.theater.name_en,
                    screen: reservationModel.performance.screen._id,
                    screen_name: reservationModel.performance.screen.name,
                    screen_name_en: reservationModel.performance.screen.name_en,
                    film: reservationModel.performance.film._id,
                    film_name: reservationModel.performance.film.name,
                    film_name_en: reservationModel.performance.film.name_en,
                    purchaser_last_name: (reservationModel.profile) ? reservationModel.profile.last_name : null,
                    purchaser_first_name: (reservationModel.profile) ? reservationModel.profile.first_name : null,
                    purchaser_email: (reservationModel.profile) ? reservationModel.profile.email : null,
                    purchaser_tel: (reservationModel.profile) ? reservationModel.profile.tel : null,
                    ticket_type: reservation.ticket_type,
                    ticket_name: reservation.ticket_name,
                    ticket_name_en: reservation.ticket_name_en,
                    ticket_price: reservation.ticket_price,
                    watcher_name: reservation.watcher_name,
                    member: (reservationModel.member) ? reservationModel.member._id : null,
                    member_user_id: (reservationModel.member) ? reservationModel.member.user_id : null,
                    sponsor: (reservationModel.sponsor) ? reservationModel.sponsor._id : null,
                    sponsor_user_id: (reservationModel.sponsor) ? reservationModel.sponsor.user_id : null,
                    sponsor_name: (reservationModel.sponsor) ? reservationModel.sponsor.name : null,
                    sponsor_email: (reservationModel.sponsor) ? reservationModel.sponsor.email : null,
                    staff: (reservationModel.staff) ? reservationModel.staff._id : null,
                    staff_user_id: (reservationModel.staff) ? reservationModel.staff.user_id : null,
                    staff_name: (reservationModel.staff) ? reservationModel.staff.name : null,
                    staff_email: (reservationModel.staff) ? reservationModel.staff.email : null,
                    staff_department_name: (reservationModel.staff) ? reservationModel.staff.department_name : null,
                    staff_tel: (reservationModel.staff) ? reservationModel.staff.tel : null,
                    staff_signature: (reservationModel.staff) ? reservationModel.staff.signature : null,
                    updated_user: _this.constructor.toString(),
                }, {
                    new: true
                }, function (err, reservationDocument) {
                    _this.logger.info('STATUS_TEMPORARY to STATUS_RESERVED processed.', err, reservationDocument);
                    if (err) {
                    }
                    else {
                        // ステータス更新に成功したらリストに追加
                        reservationModel.reservedDocuments.push(reservationDocument);
                        resolve();
                    }
                });
            }));
        });
        Promise.all(promises).then(function () {
            _this.logger.info('fix all success.');
            // TODO メール送信？
            var to;
            if (reservationModel.staff) {
                to = reservationModel.staff.email;
            }
            else if (reservationModel.sponsor) {
                to = reservationModel.sponsor.email;
            }
            else if (reservationModel.profile) {
                to = reservationModel.profile.email;
            }
            else {
            }
            if (to) {
                _this.sendCompleteEmail(to, reservationModel.reservedDocuments, function (err, json) {
                    if (err) {
                    }
                    cb(null, reservationModel);
                });
            }
            else {
                cb(null, reservationModel);
            }
        }, function (err) {
            _this.logger.error('fix all failure.', err);
            cb(err, reservationModel);
        });
    };
    /**
     * 予約プロセス用のロガーを設定する
     * 1決済管理番号につき、1ログファイル
     *
     * @param {string} paymentNo 予約番号
     */
    ReserveBaseController.prototype.setProcessLogger = function (paymentNo, cb) {
        var _this = this;
        var env = process.env.NODE_ENV || 'dev';
        var moment = require('moment');
        var logDir = __dirname + "/../../../logs/" + env + "/frontend/reserve/" + moment().format('YYYYMMDD');
        fs.mkdirs(logDir, function (err) {
            if (err) {
            }
            else {
                log4js.configure({
                    appenders: [
                        {
                            category: 'reserve',
                            type: 'dateFile',
                            filename: logDir + "/" + paymentNo + ".log",
                            pattern: '-yyyy-MM-dd',
                            backups: 3
                        },
                        {
                            type: 'console'
                        }
                    ],
                    levels: {
                        reserve: 'ALL'
                    },
                    replaceConsole: true
                });
                _this.logger = log4js.getLogger('reserve');
                cb();
            }
        });
    };
    /**
     * 予約完了メールを送信する
     */
    ReserveBaseController.prototype.sendCompleteEmail = function (to, reservationDocuments, cb) {
        var _this = this;
        this.res.render('email/reserveComplete', {
            layout: false,
            reservationDocuments: reservationDocuments
        }, function (err, html) {
            console.log(err, html);
            if (err) {
                cb(err, null);
            }
            else {
                var _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
                var email = new _sendgrid.Email({
                    to: to,
                    from: 'noreply@devtiffwebapp.azurewebsites.net',
                    subject: "[TIFF][" + process.env.NODE_ENV + "] \u4E88\u7D04\u5B8C\u4E86",
                    html: html
                });
                _this.logger.info('sending an email...email:', email);
                _sendgrid.send(email, function (err, json) {
                    _this.logger.info('an email sent.', err, json);
                    cb(err, json);
                });
            }
        });
    };
    return ReserveBaseController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReserveBaseController;
