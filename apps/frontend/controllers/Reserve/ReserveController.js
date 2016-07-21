"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ReserveBaseController_1 = require('../ReserveBaseController');
var Models_1 = require('../../../common/models/Models');
var ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
var ReservationModel_1 = require('../../models/Reserve/ReservationModel');
var ReservationResultModel_1 = require('../../models/Reserve/ReservationResultModel');
var ReserveController = (function (_super) {
    __extends(ReserveController, _super);
    function ReserveController() {
        _super.apply(this, arguments);
    }
    /**
     * 座席の状態を取得する
     */
    ReserveController.prototype.getSeatProperties = function () {
        var _this = this;
        var token = this.req.params.token;
        ReservationModel_1.default.find(token, function (err, reservationModel) {
            if (err || reservationModel === null) {
                return _this.res.json({
                    propertiesBySeatCode: {}
                });
            }
            // 予約リストを取得
            Models_1.default.Reservation.find({
                performance: reservationModel.performance._id
            }, 'seat_code status staff staff_name staff_department_name sponsor sponsor_name member member_email', {}, function (err, reservationDocuments) {
                if (err) {
                    _this.res.json({
                        propertiesBySeatCode: {}
                    });
                }
                else {
                    // 仮押さえ中の座席コードリスト
                    var seatCodesInReservation = reservationModel.getSeatCodes();
                    var propertiesBySeatCode = {};
                    for (var _i = 0, reservationDocuments_1 = reservationDocuments; _i < reservationDocuments_1.length; _i++) {
                        var reservationDocument = reservationDocuments_1[_i];
                        var seatCode = reservationDocument.get('seat_code');
                        var properties = {};
                        var classes = [];
                        var attrs = {};
                        attrs['data-reservation-id'] = reservationDocument.get('_id');
                        var baloonContent = reservationDocument.get('seat_code');
                        if (reservationDocument.get('status') === ReservationUtil_1.default.STATUS_AVAILABLE) {
                            // 予約可能
                            classes.push('select-seat');
                        }
                        else {
                            if (seatCodesInReservation.indexOf(seatCode) >= 0) {
                                // 仮押さえ中
                                classes.push('select-seat', 'active');
                            }
                            else {
                                // 予約不可
                                classes.push('disabled');
                                // 内部関係者の場合、予約情報ポップアップ
                                if (reservationModel.staff) {
                                    switch (reservationDocument.get('status')) {
                                        case ReservationUtil_1.default.STATUS_RESERVED:
                                            if (reservationDocument.get('staff')) {
                                                baloonContent += "<br>\u5185\u90E8\u95A2\u4FC2\u8005" + reservationDocument.get('staff_department_name') + "<br>" + reservationDocument.get('staff_name');
                                            }
                                            else if (reservationDocument.get('sponsor')) {
                                                baloonContent += "<br>\u5916\u90E8\u95A2\u4FC2\u8005" + reservationDocument.get('sponsor_name');
                                            }
                                            else if (reservationDocument.get('member')) {
                                                baloonContent += "<br>\u30E1\u30EB\u30DE\u30AC\u5F53\u9078\u8005" + reservationDocument.get('member_email');
                                            }
                                            else {
                                                baloonContent += '<br>一般';
                                            }
                                            break;
                                        case ReservationUtil_1.default.STATUS_TEMPORARY:
                                            baloonContent += '<br>仮予約中...';
                                            break;
                                        case ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT:
                                            baloonContent += '<br>決済中...';
                                            break;
                                        case ReservationUtil_1.default.STATUS_KEPT_BY_TIFF:
                                            baloonContent += '<br>TIFF確保中...';
                                            break;
                                        default:
                                            break;
                                    }
                                }
                                else {
                                }
                            }
                        }
                        attrs['data-baloon-content'] = baloonContent;
                        properties['classes'] = classes;
                        properties['attrs'] = attrs;
                        propertiesBySeatCode[seatCode] = properties;
                    }
                    _this.res.json({
                        propertiesBySeatCode: propertiesBySeatCode
                    });
                }
            });
        });
    };
    /**
     * 予約情報メールを送信する
     */
    ReserveController.prototype.email = function () {
        var _this = this;
        var id = this.req.body.id;
        Models_1.default.Reservation.findOne({
            _id: id,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }, function (err, reservationDocument) {
            if (err || reservationDocument === null) {
                _this.res.json({
                    isSuccess: false
                });
            }
            else {
                var to = void 0;
                if (reservationDocument.get('staff_email')) {
                    to = reservationDocument.get('staff_email');
                }
                else if (reservationDocument.get('sponsor_email')) {
                    to = reservationDocument.get('sponsor_email');
                }
                else if (reservationDocument.get('purchaser_email')) {
                    to = reservationDocument.get('purchaser_email');
                }
                else {
                }
                if (to) {
                    _this.sendCompleteEmail(to, [reservationDocument], function (err, json) {
                        if (err) {
                            // TODO log
                            _this.res.json({
                                isSuccess: false
                            });
                        }
                        else {
                            _this.res.json({
                                isSuccess: true
                            });
                        }
                    });
                }
                else {
                    _this.res.json({
                        isSuccess: false
                    });
                }
            }
        });
    };
    /**
     * create barcode by reservation token and reservation id.
     */
    ReserveController.prototype.barcode = function () {
        var _this = this;
        var token = this.req.params.token;
        var reservationId = this.req.params.reservationId;
        // getting reservation document from redis by reservationId...
        ReservationResultModel_1.default.find(token, function (err, reservationResultModel) {
            if (err || reservationResultModel === null) {
                return _this.res.send('false');
            }
            var reservation;
            for (var _i = 0, _a = reservationResultModel.reservedDocuments; _i < _a.length; _i++) {
                var reservedDocument = _a[_i];
                if (reservedDocument._id == reservationId) {
                    reservation = reservedDocument;
                    break;
                }
            }
            if (!reservation) {
                return _this.res.send('false');
            }
            ReservationUtil_1.default.createBarcode(reservation._id, function (err, png) {
                if (err) {
                    _this.res.send('false');
                }
                else {
                    // `png` is a Buffer
                    _this.res.setHeader('Content-Type', 'image/png');
                    _this.res.send(png);
                }
            });
        });
    };
    /**
     * create qrcode by reservation token and reservation id.
     */
    ReserveController.prototype.qrcode = function () {
        var _this = this;
        var token = this.req.params.token;
        var reservationId = this.req.params.reservationId;
        // getting reservation document from redis by reservationId...
        ReservationResultModel_1.default.find(token, function (err, reservationResultModel) {
            if (err || reservationResultModel === null) {
                return _this.res.send('false');
            }
            var reservation;
            for (var _i = 0, _a = reservationResultModel.reservedDocuments; _i < _a.length; _i++) {
                var reservedDocument = _a[_i];
                if (reservedDocument._id == reservationId) {
                    reservation = reservedDocument;
                    break;
                }
            }
            if (!reservation) {
                return _this.res.send('false');
            }
            var png = ReservationUtil_1.default.createQRCode(reservation._id);
            _this.res.setHeader('Content-Type', 'image/png');
            png.pipe(_this.res);
        });
    };
    return ReserveController;
}(ReserveBaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReserveController;
