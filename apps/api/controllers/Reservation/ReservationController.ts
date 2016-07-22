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
        Models.Reservation.findOne(
            {
                _id: id,
                status: ReservationUtil.STATUS_RESERVED
            },
            (err, reservationDocument) => {
                if (err || reservationDocument === null) {
                    this.res.json({
                        isSuccess: false
                    });

                } else {

                    let to: string;
                    if (reservationDocument.get('staff_email')) {
                        to = reservationDocument.get('staff_email');
                    } else if (reservationDocument.get('sponsor_email')) {
                        to = reservationDocument.get('sponsor_email');
                    } else if (reservationDocument.get('purchaser_email')) {
                        to = reservationDocument.get('purchaser_email');
                    } else {
                    }

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
                                    html: html,
                                    files: [
                                        {
                                            filename: `QR_${reservationDocument.get('_id').toString()}.png`,           // required only if file.content is used.
                                            contentType: 'iamge/png',           // optional
                                            cid: 'qrcode',           // optional, used to specify cid for inline content
                                            content: qrcodeBuffer //
                                        }
                                    ]
                                });

                                this.logger.info('sending an email...email:', email);
                                _sendgrid.send(email, (err, json) => {
                                    this.logger.info('an email sent.', err, json);
                                    if (err) {
                                        // TODO log
                                        this.res.json({
                                            isSuccess: false
                                        });

                                    } else {
                                        this.res.json({
                                            isSuccess: true
                                        });

                                    }

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
}
