"use strict";
const BaseController_1 = require('../BaseController');
const Util_1 = require('../../../common/Util/Util');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const GMOUtil_1 = require('../../../common/Util/GMO/GMOUtil');
const moment = require('moment');
const conf = require('config');
const mongoose = require('mongoose');
const sendgrid = require('sendgrid');
const emailTemplates = require('email-templates');
const qr = require('qr-image');
const fs = require('fs-extra');
const numeral = require('numeral');
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
            let promises = ids.map((id) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('updating to STATUS_KEPT_BY_TIFF...id:', id);
                    Models_1.default.Reservation.findOneAndUpdate({ _id: id }, { status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF }, { new: true }, (err, raw) => {
                        this.logger.info('updated to STATUS_KEPT_BY_TIFF. id:', id, err, raw);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                mongoose.disconnect();
                process.exit(0);
            }, (err) => {
                // 失敗しても、次のタスクにまかせる(気にしない)
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
        Models_1.default.ReservationEmailCue.find({ is_sent: false }).limit(10).exec((err, cues) => {
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
            let promises = cues.map((cue) => {
                return new Promise((resolve, reject) => {
                    // 予約ロガーを取得
                    Util_1.default.getReservationLogger(cue.get('payment_no'), (err, _logger) => {
                        if (err) {
                            // 失敗したらデフォルトロガーに逃げる
                            _logger = this.logger;
                        }
                        Models_1.default.Reservation.find({
                            payment_no: cue.get('payment_no')
                        }, (err, reservations) => {
                            _logger.info('reservations for email found.', err, reservations.length);
                            if (err)
                                return resolve();
                            if (reservations.length === 0) {
                                // 送信済みフラグを立てる
                                _logger.info('setting is_sent to true...');
                                cue.set('is_sent', true);
                                cue.save((err, res) => {
                                    _logger.info('cue saved.', err);
                                    resolve();
                                });
                                return;
                            }
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
                            _logger.info('to is', to);
                            if (!to) {
                                // 送信済みフラグを立てる
                                _logger.info('setting is_sent to true...');
                                cue.set('is_sent', true);
                                cue.save((err, res) => {
                                    _logger.info('cue saved.', err);
                                    resolve();
                                });
                                return;
                            }
                            let EmailTemplate = emailTemplates.EmailTemplate;
                            // __dirnameを使うとテンプレートを取得できないので注意
                            // http://stackoverflow.com/questions/38173996/azure-and-node-js-dirname
                            let dir;
                            let title;
                            switch (reservations[0].get('status')) {
                                case ReservationUtil_1.default.STATUS_RESERVED:
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete`;
                                    title = '東京国際映画祭チケット購入完了のお知らせ';
                                    break;
                                case ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT:
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement`;
                                    title = '東京国際映画祭チケット仮予約完了のお知らせ';
                                    break;
                                default:
                                    break;
                            }
                            if (!dir) {
                                // 送信済みフラグを立てる
                                _logger.info('setting is_sent to true...');
                                cue.set('is_sent', true);
                                cue.save((err, res) => {
                                    _logger.info('cue saved.', err);
                                    resolve();
                                });
                                return;
                            }
                            let template = new EmailTemplate(dir);
                            let locals = {
                                title: title,
                                reservations: reservations,
                                moment: moment,
                                numeral: numeral,
                                GMOUtil: GMOUtil_1.default
                            };
                            _logger.info('rendering template...dir:', dir);
                            template.render(locals, (err, result) => {
                                _logger.info('email template rendered.', err);
                                if (err)
                                    return resolve();
                                let email = new _sendgrid.Email({
                                    to: to,
                                    from: `noreply@${conf.get('dns_name')}`,
                                    subject: `${(process.env.NODE_ENV !== 'prod') ? `[${process.env.NODE_ENV}]` : ''}${title}`,
                                    html: result.html
                                });
                                // 完了の場合、QRコードを添付
                                if (reservations[0].get('status') === ReservationUtil_1.default.STATUS_RESERVED) {
                                    // add barcodes
                                    for (let reservation of reservations) {
                                        let reservationId = reservation.get('_id').toString();
                                        let png = qr.imageSync(reservation.get('qr_str'), { type: 'png' });
                                        email.addFile({
                                            filename: `QR_${reservationId}.png`,
                                            contentType: 'image/png',
                                            cid: `qrcode_${reservationId}`,
                                            content: png
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
                                _logger.info('sending an email...email:', email);
                                _sendgrid.send(email, (err, json) => {
                                    _logger.info('an email sent.', err, json);
                                    if (err)
                                        return resolve();
                                    // 送信済みフラグを立てる
                                    _logger.info('setting is_sent to true...');
                                    cue.set('is_sent', true);
                                    cue.save((err, res) => {
                                        _logger.info('cue saved.', err);
                                        resolve();
                                    });
                                });
                            });
                        });
                    });
                });
            });
            Promise.all(promises).then(() => {
                mongoose.disconnect();
                process.exit(0);
            });
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
    /**
     * パフォーマンスの上映中止フラグを予約に反映する
     */
    setPerformanceCanceledFlags() {
        mongoose.connect(MONGOLAB_URI, {});
        // いったん上映中止フラグをオフにしてから、パフォーマンスのフラグを反映する
        Models_1.default.Reservation.update({ performance_canceled: true }, { performance_canceled: false }, { multi: true }, (err, raw) => {
            this.logger.info('updated.', err, raw);
            this.logger.info('finding performances...');
            Models_1.default.Performance.distinct('_id', { canceled: true }, (err, performanceIds) => {
                this.logger.info('performaces found.', err, performanceIds);
                Models_1.default.Reservation.update({ performance: { $in: performanceIds } }, { performance_canceled: true }, { multi: true }, (err, raw) => {
                    this.logger.info('updated.', err, raw);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationController;
