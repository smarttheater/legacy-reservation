import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
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

export default class ReservationController extends BaseController {
    /**
     * 仮予約ステータスで、一定時間過ぎた予約を空席にする
     */
    public removeTmps(): void {
        mongoose.connect(MONGOLAB_URI, {});

        // 念のため、仮予約有効期間より1分長めにしておく
        let seconds = conf.get<number>('temporary_reservation_valid_period_seconds') + 60;
        this.logger.info('removing temporary reservations...');
        Models.Reservation.remove(
            {
                status: ReservationUtil.STATUS_TEMPORARY,
                updated_at: {
                    $lt: moment().add(-seconds, 'seconds').toISOString()
                }
            },
            (err) => {
                this.logger.info('temporary reservations removed.', err);

                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                }

                mongoose.disconnect();
                process.exit(0);
            }
        );
    }

    /**
     * TIFF確保上の仮予約をTIFF確保へ戻す
     */
    public tmp2tiff(): void {
        mongoose.connect(MONGOLAB_URI, {});

        // 念のため、仮予約有効期間より1分長めにしておく
        let seconds = conf.get<number>('temporary_reservation_valid_period_seconds') + 60;
        Models.Reservation.distinct(
            '_id',
            {
                status: ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TIFF,
                updated_at: {
                    $lt: moment().add(-seconds, 'seconds').toISOString()
                }
            },
            (err, ids) => {
                this.logger.info('updateStatus2keptbytiff processing...ids:', ids);
                Models.Reservation['updateStatus2keptbytiff'](ids, (err, raw) => {
                    this.logger.info('updateStatus2keptbytiff processed.', err, raw);
                    // 失敗しても、次のタスクにまかせる(気にしない)
                    if (err) {
                    }

                    mongoose.disconnect();
                    process.exit(0);
                });
            }
        );
    }

    /**
     * GMOコンビニ決済入金待ちを時間切れで空席にする
     */
    public removeWaiting(): void {
        mongoose.connect(MONGOLAB_URI, {});

        let hours = conf.get<number>('waiting_settlement_reservatioin_valid_period_hours');
        this.logger.info('removing STATUS_WAITING_SETTLEMENT reservations...');
        Models.Reservation.remove(
            {
                status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
                updated_at: {
                    $lt: moment().add(-hours, 'hours').toISOString()
                }
            },
            (err) => {
                this.logger.info('STATUS_WAITING_SETTLEMENT reservations removed.', err);

                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                }

                mongoose.disconnect();
                process.exit(0);
            }
        );
    }

    /**
     * 固定日時を経過したら、空席ステータスにするバッチ
     */
    public releaseSeatsKeptByMembers() {
        if (moment(conf.get<string>('datetimes.reservation_end_members')) < moment()) {
            mongoose.connect(MONGOLAB_URI, {});

            this.logger.info('releasing reservations kept by members...');
            Models.Reservation.remove(
                {
                    status: ReservationUtil.STATUS_KEPT_BY_MEMBER
                },
                (err) => {
                    // 失敗しても、次のタスクにまかせる(気にしない)
                    if (err) {
                    } else {
                    }

                    mongoose.disconnect();
                    process.exit(0);
                }
            );
        } else {
            process.exit(0);            
        }
    }

    /**
     * 予約完了メールを送信する
     */
    public sendEmails(): void {
        mongoose.connect(MONGOLAB_URI, {});

        this.logger.info('finding reservationEmailCues...');
        Models.ReservationEmailCue.find(
            {
                is_sent: false
            }
        ).limit(10).exec((err, cues) => {
            this.logger.info('reservationEmailCues found.', err, cues);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            if (cues.length === 0) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            let _sendgrid = sendgrid(conf.get<string>('sendgrid_username'), conf.get<string>('sendgrid_password'));

            let next = (i: number) => {
                if (i === cues.length) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;

                }

                let cue = cues[i];

                // 予約ロガーを取得
                Util.getReservationLogger(cue.get('payment_no'), (err, logger) => {
                    if (err) {
                        // 失敗したらデフォルトロガーに逃げる
                    } else {
                        this.logger = logger;
                    }

                    // 送信
                    Models.Reservation.find(
                        {
                            payment_no: cue.get('payment_no'),
                            status: ReservationUtil.STATUS_RESERVED
                        },
                        (err, reservations) => {
                            this.logger.info('reservations for email found.', err, reservations.length);
                            if (err) {
                                i++;
                                next(i);
                            } else {
                                if (reservations.length === 0) {
                                    // 送信済みフラグを立てる
                                    this.logger.info('setting is_sent to true...');
                                    cue.set('is_sent', true);
                                    cue.save((err, res) => {
                                        this.logger.info('cue saved.');
                                        i++;
                                        next(i);
                                    });
                                } else {
                                    let to = '';
                                    let purchaserGroup = reservations[0].get('purchaser_group');
                                    switch (purchaserGroup) {
                                        case ReservationUtil.PURCHASER_GROUP_CUSTOMER:
                                        case ReservationUtil.PURCHASER_GROUP_MEMBER:
                                        case ReservationUtil.PURCHASER_GROUP_SPONSOR:
                                            to = reservations[0].get('purchaser_email')
                                            break;

                                        case ReservationUtil.PURCHASER_GROUP_STAFF:
                                            to = reservations[0].get('staff_email')
                                            break;

                                        default:
                                            break;
                                    }

                                    this.logger.info('to is', to);

                                    if (!to) {
                                        // 送信済みフラグを立てる
                                        this.logger.info('setting is_sent to true...');
                                        cue.set('is_sent', true);
                                        cue.save((err, res) => {
                                            this.logger.info('cue saved.');
                                            i++;
                                            next(i);
                                        });
                                    } else {
                                        let EmailTemplate = emailTemplates.EmailTemplate
                                        // __dirnameを使うとテンプレートを取得できないので注意
                                        // http://stackoverflow.com/questions/38173996/azure-and-node-js-dirname
                                        let dir = `${process.cwd()}/apps/task/views/email/reserveComplete`;
                                        let template = new EmailTemplate(dir);
                                        let locals = {
                                            reservations: reservations,
                                            moment: moment,
                                            numeral: numeral,
                                            GMOUtil: GMOUtil
                                        };
                                        this.logger.info('rendering template...dir:', dir);
                                        template.render(locals, (err, result) => {
                                            this.logger.info('email template rendered.', err);
                                            if (err) {
                                                i++;
                                                next(i);
                                            } else {
                                                let email = new _sendgrid.Email({
                                                    to: to,
                                                    from: `noreply@${conf.get<string>('dns_name')}`,
                                                    subject: `${(process.env.NODE_ENV !== 'prod') ? `[${process.env.NODE_ENV}]` : ''}東京国際映画祭チケット購入完了のお知らせ`,
                                                    html: result.html
                                                });


                                                // add barcodes
                                                for (let reservation of reservations) {
                                                    let reservationId = reservation.get('_id').toString();
                                                    let png = qr.imageSync(reservation.get('qr_str'), {type: 'png'});


                                                    email.addFile({
                                                        filename: `QR_${reservationId}.png`,
                                                        contentType: 'image/png',
                                                        cid: `qrcode_${reservationId}`,
                                                        content: png
                                                    });
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
                                                    if (err) {
                                                        i++;
                                                        next(i);
                                                    } else {
                                                        // 送信済みフラグを立てる
                                                        this.logger.info('setting is_sent to true...');
                                                        cue.set('is_sent', true);
                                                        cue.save((err, res) => {
                                                            this.logger.info('cue saved.');
                                                            i++;
                                                            next(i);
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    );
                });
            }

            let i = 0;
            next(i);
        });
    }

    /**
     * 予約を初期化する
     */
    public reset(): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Reservation.remove({}, (err) => {
            this.logger.info('remove processed.', err);
            mongoose.disconnect();
            process.exit(0);
        });
    }

    public resetEntered(): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Reservation.update(
            {},
            {
                entered: false,
                entered_at: null
            },
            {
                multi: true
            },
            (err, raw) => {
                this.logger.info('updated.', err);
                mongoose.disconnect();
                process.exit(0);
            }
        );
    }
}
