import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import sendgrid = require('sendgrid');
import conf = require('config');
import validator = require('validator');
import qr = require('qr-image');
import moment = require('moment');
import fs = require('fs-extra');

export default class ReservationController extends BaseController {
    /**
     * 予約情報メールを送信する
     */
    public email(): void {
        let id = this.req.body.id;
        let to = this.req.body.to;
        // メールアドレスの有効性チェック
        if (!validator.isEmail(to)) {
            this.res.json({
                success: false,
                message: this.req.__('Message.invalid{{fieldName}}', {fieldName: this.req.__('Form.FieldName.email')})
            });
            return;
        }

        Models.Reservation.findOne(
            {
                _id: id,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservation) => {
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

                let qrcodeBuffer = qr.imageSync(reservation.get('qr_str'), {type: 'png'});
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
                    ReservationUtil: ReservationUtil
                }, (err, html) => {
                    if (err) {
                        return this.res.json({
                            success: false,
                            message: this.req.__('Message.UnexpectedError')
                        });
                    }

                    let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));
                    let performanceDateStr = moment(`${reservation.get('performance_day').substr(0, 4)}-${reservation.get('performance_day').substr(4, 2)}-${reservation.get('performance_day').substr(6)}T00:00:00+09:00`).format('DD MMMM');
                    let email = new _sendgrid.Email({
                        to: to,
                        fromname: conf.get<string>('email.fromname'),
                        from: conf.get<string>('email.from'),
                        subject: `[${performanceDateStr}]${title_ja} ${title_en}`,
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

                    this.logger.debug('sending an email...email:', email);
                    _sendgrid.send(email, (err, json) => {
                        this.logger.debug('an email sent.', err, json);
                        if (err) {
                            this.res.json({
                                success: false,
                                message: err.message
                            });
                        } else {
                            this.res.json({
                                success: true
                            });
                        }
                    });
                });
            }
        );
    }

    /**
     * 入場グラグをたてる
     */
    public enter(): void {
        Models.Reservation.update(
            {
                _id: this.req.params.id
            },
            {
                entered: true,
                entered_at: this.req.body.entered_at
            },
            (err, raw) => {
                if  (err) {
                    this.res.json({
                        success: false
                    });
                } else {
                    this.res.json({
                        success: true
                    });
                }
            }
        );
    }

    public findByMvtkUser(): void {
        // ひとまずデモ段階では、一般予約を10件返す
        Models.Reservation.find(
            {
                purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                status: ReservationUtil.STATUS_RESERVED
            }).limit(10).exec((err, reservations) => {
                if (err) {
                    this.res.json({
                        success: false,
                        reservations: []
                    });
                } else {
                    this.res.json({
                        success: true,
                        reservations: reservations
                    });
                }
            }
        );
    }

    public findById(): void {
        let id = this.req.params.id;

        Models.Reservation.findOne(
            {
                _id: id,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservation) => {
                if (err) {
                    this.res.json({
                        success: false,
                        reservation: null
                    });
                } else {
                    this.res.json({
                        success: true,
                        reservation: reservation
                    });
                }
            }
        );
    }
}
