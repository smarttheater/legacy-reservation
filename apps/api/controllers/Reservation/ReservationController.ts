import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import sendgrid = require('sendgrid');
import conf = require('config');

export default class ReservationController extends BaseController {
    /**
     * 予約情報メールを送信する
     */
    public email(): void {
        let id = this.req.body.id;
        let to = this.req.body.to;
        Models.Reservation.findOne(
            {
                _id: id,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservationDocument) => {
                if (err) {
                    return this.res.json({
                        isSuccess: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                }

                if (!reservationDocument) {
                    this.res.json({
                        isSuccess: false,
                        message: this.req.__('Message.NotFound')
                    });

                } else {
                    if (to) {
                        let qrcodeBuffer = ReservationUtil.createQRCode(reservationDocument.get('_id').toString());

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

                            } else {
                                let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));
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
 
                                ReservationUtil.createBarcode(reservationId, (err, png) => {
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
                                            this.res.json({
                                                isSuccess: false
                                            });

                                        } else {
                                            this.res.json({
                                                isSuccess: true
                                            });

                                        }

                                    });

                                });
 
                            }

                        });

                    } else {
                        this.res.json({
                            isSuccess: false
                        });

                    }
                }
            }
        );
    }

    public findByMvtkUser(): void {
        Models.Reservation.find(
            {
                mvtk_kiin_cd: this.req.user.mvtk_kiin_cd,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservationDocuments) => {
                if (err) {

                } else {
                    this.res.json({
                        isSuccess: true,
                        reservations: reservationDocuments
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
                mvtk_kiin_cd: this.req.user.mvtk_kiin_cd,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservationDocument) => {
                if (err) {

                } else {
                    this.res.json({
                        isSuccess: true,
                        reservation: reservationDocument
                    });
                }

            }
        );

    }
}
