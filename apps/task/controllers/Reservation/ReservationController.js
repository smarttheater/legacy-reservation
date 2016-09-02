"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const moment = require('moment');
const conf = require('config');
const mongoose = require('mongoose');
const sendgrid = require('sendgrid');
const emailTemplates = require('email-templates');
let MONGOLAB_URI = conf.get('mongolab_uri');
class ReservationController extends BaseController_1.default {
    /**
     * 仮予約ステータスで、一定時間過ぎた予約を空席にする
     */
    removeTmps() {
        mongoose.connect(MONGOLAB_URI, {});
        // 念のため、仮予約有効期間より1分長めにしておく
        let seconds = conf.get('temporary_reservation_valid_period_seconds') + 60;
        this.logger.info('removing temporary reservations...');
        Models_1.default.Reservation.remove({
            status: ReservationUtil_1.default.STATUS_TEMPORARY,
            updated_at: {
                $lt: moment().add(-seconds, 'seconds').toISOString()
            }
        }, (err) => {
            this.logger.info('temporary reservations removed.', err);
            // 失敗しても、次のタスクにまかせる(気にしない)
            if (err) {
            }
            mongoose.disconnect();
            process.exit(0);
        });
    }
    /**
     * TIFF確保上の仮予約をTIFF確保へ戻す
     */
    tmp2tiff() {
        mongoose.connect(MONGOLAB_URI, {});
        // 念のため、仮予約有効期間より1分長めにしておく
        let seconds = conf.get('temporary_reservation_valid_period_seconds') + 60;
        Models_1.default.Reservation.distinct('_id', {
            status: ReservationUtil_1.default.STATUS_TEMPORARY_ON_KEPT_BY_TIFF,
            updated_at: {
                $lt: moment().add(-seconds, 'seconds').toISOString()
            }
        }, (err, ids) => {
            this.logger.info('updateStatus2keptbytiff processing...ids:', ids);
            Models_1.default.Reservation['updateStatus2keptbytiff'](ids, (err, raw) => {
                this.logger.info('updateStatus2keptbytiff processed.', err, raw);
                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                }
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
    /**
     * GMOコンビニ決済入金待ちを時間切れで空席にする
     */
    removeWaiting() {
        mongoose.connect(MONGOLAB_URI, {});
        let hours = conf.get('waiting_settlement_reservatioin_valid_period_hours');
        this.logger.info('removing STATUS_WAITING_SETTLEMENT reservations...');
        Models_1.default.Reservation.remove({
            status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
            updated_at: {
                $lt: moment().add(-hours, 'hours').toISOString()
            }
        }, (err) => {
            this.logger.info('STATUS_WAITING_SETTLEMENT reservations removed.', err);
            // 失敗しても、次のタスクにまかせる(気にしない)
            if (err) {
            }
            mongoose.disconnect();
            process.exit(0);
        });
    }
    /**
     * 固定日時を経過したら、空席ステータスにするバッチ
     */
    releaseSeatsKeptByMembers() {
        if (moment(conf.get('datetimes.reservation_end_members')) < moment()) {
            mongoose.connect(MONGOLAB_URI, {});
            this.logger.info('releasing reservations kept by members...');
            Models_1.default.Reservation.remove({
                status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER
            }, (err) => {
                // 失敗しても、次のタスクにまかせる(気にしない)
                if (err) {
                }
                else {
                }
                mongoose.disconnect();
                process.exit(0);
            });
        }
        else {
            process.exit(0);
        }
    }
    /**
     * 予約完了メールを送信する
     */
    sendEmails() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('finding reservationEmailCues...');
        Models_1.default.ReservationEmailCue.find({
            is_sent: false
        }).limit(10).exec((err, cues) => {
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
            let _sendgrid = sendgrid(conf.get('sendgrid_username'), conf.get('sendgrid_password'));
            let next = (i) => {
                if (i === cues.length) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                let cue = cues[i];
                // 予約ロガーを取得
                Util_1.default.getReservationLogger(cue.get('payment_no'), (err, logger) => {
                    if (err) {
                    }
                    else {
                        this.logger = logger;
                    }
                    // 送信
                    Models_1.default.Reservation.find({
                        payment_no: cue.get('payment_no'),
                        status: ReservationUtil_1.default.STATUS_RESERVED
                    }, (err, reservations) => {
                        this.logger.info('reservations for email found.', err, reservations.length);
                        if (err) {
                            i++;
                            next(i);
                        }
                        else {
                            if (reservations.length === 0) {
                                // 送信済みフラグを立てる
                                this.logger.info('setting is_sent to true...');
                                cue.set('is_sent', true);
                                cue.save((err, res) => {
                                    this.logger.info('cue saved.');
                                    i++;
                                    next(i);
                                });
                            }
                            else {
                                let to = '';
                                let purchaserGroup = reservations[0].get('purchaser_group');
                                switch (purchaserGroup) {
                                    case ReservationUtil_1.default.PURCHASER_GROUP_CUSTOMER:
                                    case ReservationUtil_1.default.PURCHASER_GROUP_MEMBER:
                                    case ReservationUtil_1.default.PURCHASER_GROUP_SPONSOR:
                                        to = reservations[0].get('purchaser_email');
                                        break;
                                    case ReservationUtil_1.default.PURCHASER_GROUP_STAFF:
                                        to = reservations[0].get('staff_email');
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
                                }
                                else {
                                    let EmailTemplate = emailTemplates.EmailTemplate;
                                    // __dirnameを使うとテンプレートを取得できないので注意
                                    // http://stackoverflow.com/questions/38173996/azure-and-node-js-dirname
                                    let dir = `${process.cwd()}/apps/task/views/email/reserveComplete`;
                                    let template = new EmailTemplate(dir);
                                    let locals = {
                                        reservations: reservations
                                    };
                                    this.logger.info('rendering template...dir:', dir);
                                    template.render(locals, (err, result) => {
                                        this.logger.info('email template rendered.', err);
                                        if (err) {
                                            i++;
                                            next(i);
                                        }
                                        else {
                                            let email = new _sendgrid.Email({
                                                to: to,
                                                from: `noreply@${conf.get('dns_name')}`,
                                                subject: `[TIFF][${process.env.NODE_ENV}] 予約完了`,
                                                html: result.html
                                            });
                                            // add barcodes
                                            for (let reservation of reservations) {
                                                let reservationId = reservation.get('_id').toString();
                                                email.addFile({
                                                    filename: `QR_${reservationId}.png`,
                                                    contentType: 'image/png',
                                                    cid: `qrcode_${reservationId}`,
                                                    content: Util_1.default.createQRCode(reservationId)
                                                });
                                            }
                                            this.logger.info('sending an email...email:', email);
                                            _sendgrid.send(email, (err, json) => {
                                                this.logger.info('an email sent.', err, json);
                                                if (err) {
                                                    i++;
                                                    next(i);
                                                }
                                                else {
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
                    });
                });
            };
            let i = 0;
            next(i);
        });
    }
    /**
     * 予約を初期化する
     */
    reset() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Reservation.remove({}, (err) => {
            this.logger.info('remove processed.', err);
            mongoose.disconnect();
            process.exit(0);
        });
    }
    resetEntered() {
        mongoose.connect(MONGOLAB_URI, {});
        Models_1.default.Reservation.update({}, {
            entered: false,
            entered_at: null
        }, {
            multi: true
        }, (err, raw) => {
            this.logger.info('updated.', err);
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationController;
