"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const sendgrid = require('sendgrid');
const conf = require('config');
const validator = require('validator');
const qr = require('qr-image');
class ReservationController extends BaseController_1.default {
    /**
     * 予約情報メールを送信する
     */
    email() {
        let id = this.req.body.id;
        let to = this.req.body.to;
        // メールアドレスの有効性チェック
        if (!validator.isEmail(to)) {
            this.res.json({
                success: false,
                message: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.email') })
            });
            return;
        }
        Models_1.default.Reservation.findOne({
            _id: id,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }, (err, reservation) => {
            if (err) {
                return this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError')
                });
            }
            if (!reservation) {
                return this.res.json({
                    success: false,
                    message: this.req.__('Message.NotFound')
                });
            }
            let qrcodeBuffer = qr.imageSync(reservation.get('qr_str'), { type: 'png' });
            this.res.render('email/resevation', {
                layout: false,
                reservations: [reservation],
                qrcode: qrcodeBuffer
            }, (err, html) => {
                if (err) {
                    return this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                }
                let _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
                let email = new _sendgrid.Email({
                    to: to,
                    from: `noreply@${conf.get('dns_name')}`,
                    subject: `[TIFF][${process.env.NODE_ENV}] 予約情報転送`,
                    html: html
                });
                let reservationId = reservation.get('_id').toString();
                email.addFile({
                    filename: `QR_${reservationId}.png`,
                    contentType: 'image/png',
                    cid: `qrcode_${reservationId}`,
                    content: qrcodeBuffer
                });
                email.addFile({
                    filename: `qrcode4attachment_${reservationId}.png`,
                    contentType: 'image/png',
                    content: qrcodeBuffer
                });
                this.logger.debug('sending an email...email:', email);
                _sendgrid.send(email, (err, json) => {
                    this.logger.debug('an email sent.', err, json);
                    if (err) {
                        this.res.json({
                            success: false,
                            message: err.message
                        });
                    }
                    else {
                        this.res.json({
                            success: true
                        });
                    }
                });
            });
        });
    }
    /**
     * 入場グラグをたてる
     */
    enter() {
        Models_1.default.Reservation.update({
            _id: this.req.params.id
        }, {
            entered: true,
            entered_at: this.req.body.entered_at
        }, (err, raw) => {
            if (err) {
                this.res.json({
                    success: false
                });
            }
            else {
                this.res.json({
                    success: true
                });
            }
        });
    }
    findByMvtkUser() {
        // ひとまずデモ段階では、一般予約を10件返す
        Models_1.default.Reservation.find({
            purchaser_group: ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }).limit(10).exec((err, reservations) => {
            if (err) {
                this.res.json({
                    success: false,
                    reservations: []
                });
            }
            else {
                this.res.json({
                    success: true,
                    reservations: reservations
                });
            }
        });
    }
    findById() {
        let id = this.req.params.id;
        Models_1.default.Reservation.findOne({
            _id: id,
            status: ReservationUtil_1.default.STATUS_RESERVED
        }, (err, reservation) => {
            if (err) {
                this.res.json({
                    success: false,
                    reservation: null
                });
            }
            else {
                this.res.json({
                    success: true,
                    reservation: reservation
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationController;
