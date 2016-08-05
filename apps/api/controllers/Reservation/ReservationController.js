"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const sendgrid = require('sendgrid');
const conf = require('config');
class ReservationController extends BaseController_1.default {
    /**
     * 予約情報メールを送信する
     */
    email() {
        let id = this.req.body.id;
        let to = this.req.body.to;
        Models_1.default.Reservation.findOne({
            _id: id,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }, (err, reservationDocument) => {
            if (err || reservationDocument === null) {
                this.res.json({
                    isSuccess: false
                });
            }
            else {
                if (to) {
                    let qrcodeBuffer = ReservationUtil_1.default.createQRCode(reservationDocument.get('_id').toString());
                    this.res.render('email/resevation', {
                        layout: false,
                        reservationDocuments: [reservationDocument],
                        qrcode: qrcodeBuffer
                    }, (err, html) => {
                        console.log(err, html);
                        if (err) {
                            this.res.json({
                                isSuccess: false
                            });
                        }
                        else {
                            let _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
                            let email = new _sendgrid.Email({
                                to: to,
                                from: 'noreply@devtiffwebapp.azurewebsites.net',
                                subject: `[TIFF][${process.env.NODE_ENV}] 予約情報`,
                                html: html
                            });
                            let reservationId = reservationDocument.get('_id').toString();
                            email.addFile({
                                filename: `QR_${reservationId}.png`,
                                contentType: 'image/png',
                                cid: 'qrcode',
                                content: qrcodeBuffer
                            });
                            email.addFile({
                                filename: `qrcode4attachment_${reservationId}.png`,
                                contentType: 'image/png',
                                content: qrcodeBuffer
                            });
                            ReservationUtil_1.default.createBarcode(reservationId, (err, png) => {
                                email.addFile({
                                    filename: `barcode_${reservationId}.png`,
                                    contentType: 'image/png',
                                    cid: 'barcode',
                                    content: png
                                });
                                email.addFile({
                                    filename: `barcode4attachment_${reservationId}.png`,
                                    contentType: 'image/png',
                                    content: png
                                });
                                this.logger.info('sending an email...email:', email);
                                _sendgrid.send(email, (err, json) => {
                                    this.logger.info('an email sent.', err, json);
                                    if (err) {
                                        // TODO log
                                        this.res.json({
                                            isSuccess: false
                                        });
                                    }
                                    else {
                                        this.res.json({
                                            isSuccess: true
                                        });
                                    }
                                });
                            });
                        }
                    });
                }
                else {
                    this.res.json({
                        isSuccess: false
                    });
                }
            }
        });
    }
    findByMvtkUser() {
        Models_1.default.Reservation.find({
            mvtk_kiin_cd: this.req.user.mvtk_kiin_cd,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }, (err, reservationDocuments) => {
            if (err) {
            }
            else {
                this.res.json({
                    isSuccess: true,
                    reservations: reservationDocuments
                });
            }
        });
    }
    findById() {
        let id = this.req.params.id;
        Models_1.default.Reservation.findOne({
            _id: id,
            mvtk_kiin_cd: this.req.user.mvtk_kiin_cd,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }, (err, reservationDocument) => {
            if (err) {
            }
            else {
                this.res.json({
                    isSuccess: true,
                    reservation: reservationDocument
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationController;
