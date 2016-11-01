"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const sendgrid = require('sendgrid');
const conf = require('config');
const validator = require('validator');
const qr = require('qr-image');
const moment = require('moment');
const fs = require('fs-extra');
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
            let title_ja = `${reservation.get('purchaser_name_ja')}様より東京国際映画祭のチケットが届いております`;
            let title_en = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservation.get('purchaser_name_en')}.`;
            this.res.render('email/resevation', {
                layout: false,
                reservations: [reservation],
                to: to,
                qrcode: qrcodeBuffer,
                moment: moment,
                conf: conf,
                title_ja: title_ja,
                title_en: title_en,
                ReservationUtil: ReservationUtil_1.default
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
                    fromname: conf.get('email.fromname'),
                    from: conf.get('email.from'),
                    subject: `${title_ja} ${title_en}`,
                    html: html
                });
                let reservationId = reservation.get('_id').toString();
                email.addFile({
                    filename: `QR_${reservationId}.png`,
                    contentType: 'image/png',
                    cid: `qrcode_${reservationId}`,
                    content: qrcodeBuffer
                });
                // logo
                email.addFile({
                    filename: `logo.png`,
                    contentType: 'image/png',
                    cid: 'logo',
                    content: fs.readFileSync(`${__dirname}/../../../../public/images/email/logo.png`)
                });
                this.logger.info('sending an email...email:', email);
                _sendgrid.send(email, (err, json) => {
                    this.logger.info('an email sent.', err, json);
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
