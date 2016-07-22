"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseController_1 = require('../BaseController');
var Models_1 = require('../../../common/models/Models');
var ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
var sendgrid = require('sendgrid');
var conf = require('config');
var ReservationController = (function (_super) {
    __extends(ReservationController, _super);
    function ReservationController() {
        _super.apply(this, arguments);
    }
    /**
     * 予約情報メールを送信する
     */
    ReservationController.prototype.email = function () {
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
                var to_1;
                if (reservationDocument.get('staff_email')) {
                    to_1 = reservationDocument.get('staff_email');
                }
                else if (reservationDocument.get('sponsor_email')) {
                    to_1 = reservationDocument.get('sponsor_email');
                }
                else if (reservationDocument.get('purchaser_email')) {
                    to_1 = reservationDocument.get('purchaser_email');
                }
                else {
                }
                if (to_1) {
                    var qrcodeBuffer_1 = ReservationUtil_1.default.createQRCode(reservationDocument.get('_id').toString());
                    _this.res.render('email/resevation', {
                        layout: false,
                        reservationDocuments: [reservationDocument],
                        qrcode: qrcodeBuffer_1
                    }, function (err, html) {
                        console.log(err, html);
                        if (err) {
                            _this.res.json({
                                isSuccess: false
                            });
                        }
                        else {
                            var _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
                            var email = new _sendgrid.Email({
                                to: to_1,
                                from: 'noreply@devtiffwebapp.azurewebsites.net',
                                subject: "[TIFF][" + process.env.NODE_ENV + "] \u4E88\u7D04\u60C5\u5831",
                                html: html,
                                files: [
                                    {
                                        filename: "QR_" + reservationDocument.get('_id').toString() + ".png",
                                        contentType: 'iamge/png',
                                        cid: 'qrcode',
                                        content: qrcodeBuffer_1 //
                                    }
                                ]
                            });
                            _this.logger.info('sending an email...email:', email);
                            _sendgrid.send(email, function (err, json) {
                                _this.logger.info('an email sent.', err, json);
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
    return ReservationController;
}(BaseController_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationController;
