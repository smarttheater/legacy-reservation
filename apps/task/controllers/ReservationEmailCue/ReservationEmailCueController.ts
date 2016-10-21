import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationEmailCueUtil from '../../../common/models/ReservationEmailCue/ReservationEmailCueUtil';
import GMOUtil from '../../../common/Util/GMO/GMOUtil';
import moment = require('moment');
import conf = require('config');
import mongoose = require('mongoose');
import sendgrid = require('sendgrid')
import emailTemplates = require('email-templates');
import qr = require('qr-image');
import fs = require('fs-extra');
import numeral = require('numeral');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class ReservationEmailCueController extends BaseController {
    /**
     * 予約完了メールを送信する
     */
    public sendOne(): void {
        mongoose.connect(MONGOLAB_URI, {});

        this.logger.info('finding reservationEmailCue...');
        Models.ReservationEmailCue.findOneAndUpdate({
            status: ReservationEmailCueUtil.STATUS_UNSENT
        }, {
            status: ReservationEmailCueUtil.STATUS_SENDING
        }, {new: true}, (err, cue) => {
            this.logger.info('reservationEmailCue found.', err, cue);
            if (err) return this.next(err, cue);
            if (!cue) return this.next(null, cue);

            // 予約ロガーを取得
            Util.getReservationLogger(cue.get('payment_no'), (err, logger) => {
                if (!err) {
                    this.logger = logger;
                }

                Models.Reservation.find({
                    payment_no: cue.get('payment_no')
                }, (err, reservations) => {
                        this.logger.info('reservations for email found.', err, reservations.length);
                        if (err) return this.next(err, cue);
                        if (reservations.length === 0) return this.next(null, cue);

                        let to = '';
                        switch (reservations[0].get('purchaser_group')) {
                            case ReservationUtil.PURCHASER_GROUP_STAFF:
                                to = reservations[0].get('staff_email')
                                break;

                            default:
                                to = reservations[0].get('purchaser_email')
                                break;
                        }

                        this.logger.info('to is', to);
                        if (!to) return this.next(null, cue);

                        let EmailTemplate = emailTemplates.EmailTemplate
                        // __dirnameを使うとテンプレートを取得できないので注意
                        // http://stackoverflow.com/questions/38173996/azure-and-node-js-dirname
                        let dir: string;
                        let title_ja: string;
                        let title_en: string;
                        switch (cue.get('template')) {
                            case ReservationEmailCueUtil.TEMPLATE_COMPLETE:
                                // 1.5次販売はメールテンプレート別
                                if (reservations[0].get('pre_customer')) {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete4preCustomer`;
                                    title_ja = '東京国際映画祭チケット 購入完了のお知らせ';
                                    title_en = 'Notice of Completion of TIFF Ticket Purchase';
                                } else {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete`;
                                    title_ja = '東京国際映画祭チケット 購入完了のお知らせ';
                                    title_en = 'Notice of Completion of TIFF Ticket Purchase';
                                }

                                break;
                            case ReservationEmailCueUtil.TEMPLATE_TEMPORARY:
                                // 1.5次販売はメールテンプレート別
                                if (reservations[0].get('pre_customer')) {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement4preCustomer`;
                                    title_ja = '東京国際映画祭チケット 仮予約完了のお知らせ';
                                    title_en = 'Notice of Completion of Tentative Reservation for TIFF Tickets';
                                } else {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement`;
                                    title_ja = '東京国際映画祭チケット 仮予約完了のお知らせ';
                                    title_en = 'Notice of Completion of Tentative Reservation for TIFF Tickets';
                                }

                                break;
                            default:
                                break;
                        }

                        let template = new EmailTemplate(dir);
                        let locals = {
                            title_ja: title_ja,
                            title_en: title_en,
                            reservations: reservations,
                            moment: moment,
                            numeral: numeral,
                            conf: conf,
                            GMOUtil: GMOUtil,
                            ReservationUtil: ReservationUtil
                        };

                        this.logger.info('rendering template...dir:', dir);
                        template.render(locals, (err, result) => {
                            this.logger.info('email template rendered.', err);
                            if (err) return this.next(new Error('failed in rendering an email.'), cue);

                            let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));
                            let email = new _sendgrid.Email({
                                to: to,
                                fromname: conf.get<string>('email.fromname'),
                                from: conf.get<string>('email.from'),
                                subject: `${(process.env.NODE_ENV !== 'prod') ? `[${process.env.NODE_ENV}]` : ''}${title_ja} ${title_en}`,
                                html: result.html
                            });

                            // 完了の場合、QRコードを添付
                            if (cue.get('template') === ReservationEmailCueUtil.TEMPLATE_COMPLETE) {
                                // add barcodes
                                for (let reservation of reservations) {
                                    let reservationId = reservation.get('_id').toString();

                                    email.addFile({
                                        filename: `QR_${reservationId}.png`,
                                        contentType: 'image/png',
                                        cid: `qrcode_${reservationId}`,
                                        content: qr.imageSync(reservation.get('qr_str'), {type: 'png'})
                                    });
                                }
                            }

                            // add logo
                            email.addFile({
                                filename: `logo.png`,
                                contentType: 'image/png',
                                cid: 'logo',
                                content: fs.readFileSync(`${__dirname}/../../../../public/images/email/logo.png`)
                            });

                            this.logger.info('sending an email...email:', email);
                            _sendgrid.send(email, (err, json) => {
                                this.logger.info('an email sent.', err, json);
                                this.next(err, cue);
                            });
                        });
                    }
                );
            });
        });
    }

    private next(err: Error, cue: mongoose.Document): void {
        if (!cue) {
            mongoose.disconnect();
            process.exit(0);
            return;
        }

        let status = (err) ? ReservationEmailCueUtil.STATUS_UNSENT : ReservationEmailCueUtil.STATUS_SENT;

        // 送信済みフラグを立てる
        this.logger.info('setting status...', status);
        cue.set('status', status);
        cue.save((err, res) => {
            this.logger.info('cue saved.', err, res);
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
