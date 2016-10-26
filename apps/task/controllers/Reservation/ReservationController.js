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
const request = require('request');
const querystring = require('querystring');
let MONGOLAB_URI = conf.get('mongolab_uri');
class ReservationController extends BaseController_1.default {
    /**
     * 仮予約ステータスで、一定時間過ぎた予約を空席にする
     */
    removeTmps() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('removing temporary reservations...');
        Models_1.default.Reservation.remove({
            status: ReservationUtil_1.default.STATUS_TEMPORARY,
            expired_at: {
                // 念のため、仮予約有効期間より1分長めにしておく
                $lt: moment().add(-60, 'seconds').toISOString()
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
        Models_1.default.Reservation.distinct('_id', {
            status: ReservationUtil_1.default.STATUS_TEMPORARY_ON_KEPT_BY_TIFF,
            expired_at: {
                // 念のため、仮予約有効期間より1分長めにしておく
                $lt: moment().add(-60, 'seconds').toISOString()
            }
        }, (err, ids) => {
            let promises = ids.map((id) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('updating to STATUS_KEPT_BY_TIFF...id:', id);
                    Models_1.default.Reservation.findOneAndUpdate({ _id: id }, { status: ReservationUtil_1.default.STATUS_KEPT_BY_TIFF }, { new: true }, (err, reservation) => {
                        this.logger.info('updated to STATUS_KEPT_BY_TIFF. id:', id, err, reservation);
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
     * 固定日時を経過したら、空席ステータスにするバッチ
     */
    releaseSeatsKeptByMembers() {
        if (moment(conf.get('datetimes.reservation_end_members')) < moment()) {
            mongoose.connect(MONGOLAB_URI);
            // 内部関係者で確保する
            Models_1.default.Staff.findOne({
                user_id: "2016sagyo2"
            }, (err, staff) => {
                this.logger.info('staff found.', err, staff);
                if (err) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                // 購入番号発行
                ReservationUtil_1.default.publishPaymentNo((err, paymentNo) => {
                    this.logger.info('paymentNo is', paymentNo);
                    if (err) {
                        mongoose.disconnect();
                        process.exit(0);
                        return;
                    }
                    Models_1.default.Reservation.find({
                        status: ReservationUtil_1.default.STATUS_KEPT_BY_MEMBER
                    }, (err, reservations) => {
                        if (err) {
                            mongoose.disconnect();
                            process.exit(0);
                            return;
                        }
                        let promises = reservations.map((reservation, index) => {
                            return new Promise((resolve, reject) => {
                                this.logger.info('finding performance...');
                                Models_1.default.Performance.findOne({
                                    _id: reservation.get('performance')
                                })
                                    .populate('film', 'name is_mx4d copyright')
                                    .populate('screen', 'name')
                                    .populate('theater', 'name address')
                                    .exec((err, performance) => {
                                    if (err)
                                        return reject(err);
                                    this.logger.info('updating reservation...');
                                    reservation.update({
                                        "status": ReservationUtil_1.default.STATUS_RESERVED,
                                        "staff": staff.get('_id'),
                                        "staff_user_id": staff.get('user_id'),
                                        "staff_email": staff.get('email'),
                                        "staff_name": staff.get('name'),
                                        "staff_signature": "system",
                                        "entered": false,
                                        "updated_user": "system",
                                        "purchased_at": Date.now(),
                                        "watcher_name_updated_at": null,
                                        "watcher_name": "",
                                        "film_copyright": performance.get('film').get('copyright'),
                                        "film_is_mx4d": performance.get('film').get('is_mx4d'),
                                        "film_image": `https://${conf.get('dns_name')}/images/film/${performance.get('film').get('_id')}.jpg`,
                                        "film_name_en": performance.get('film').get('name.en'),
                                        "film_name_ja": performance.get('film').get('name.ja'),
                                        "film": performance.get('film').get('_id'),
                                        "screen_name_en": performance.get('screen').get('name.en'),
                                        "screen_name_ja": performance.get('screen').get('name.ja'),
                                        "screen": performance.get('screen').get('_id'),
                                        "theater_name_en": performance.get('theater').get('name.en'),
                                        "theater_name_ja": performance.get('theater').get('name.ja'),
                                        "theater_address_en": performance.get('theater').get('address.en'),
                                        "theater_address_ja": performance.get('theater').get('address.ja'),
                                        "theater": performance.get('theater').get('_id'),
                                        "performance_canceled": performance.get('canceled'),
                                        "performance_end_time": performance.get('end_time'),
                                        "performance_start_time": performance.get('start_time'),
                                        "performance_open_time": performance.get('open_time'),
                                        "performance_day": performance.get('day'),
                                        "purchaser_group": ReservationUtil_1.default.PURCHASER_GROUP_STAFF,
                                        "payment_no": paymentNo,
                                        "payment_seat_index": index,
                                        "charge": 0,
                                        "ticket_type_charge": 0,
                                        "ticket_type_name_en": "Free",
                                        "ticket_type_name_ja": "無料",
                                        "ticket_type_code": "00",
                                        "seat_grade_additional_charge": 0,
                                        "seat_grade_name_en": "Normal Seat",
                                        "seat_grade_name_ja": "ノーマルシート"
                                    }, (err, raw) => {
                                        this.logger.info('reservation updated.', err, raw);
                                        (err) ? reject(err) : resolve();
                                    });
                                });
                            });
                        });
                        Promise.all(promises).then(() => {
                            this.logger.info('promised.', err);
                            mongoose.disconnect();
                            process.exit(0);
                        }).catch((err) => {
                            this.logger.info('promised.', err);
                            mongoose.disconnect();
                            process.exit(0);
                        });
                    });
                });
            });
        }
        else {
            process.exit(0);
        }
    }
    /**
     * GMO離脱データを解放する(内部確保)
     */
    releaseGarbages() {
        mongoose.connect(MONGOLAB_URI);
        // 一定期間WAITING_SETTLEMENTの予約を抽出
        Models_1.default.Reservation.find({
            status: ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT,
            updated_at: { $lt: moment().add(-2, 'hours').toISOString() }
        }, (err, reservations) => {
            this.logger.info('reservations found.', err, reservations);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            let paymentNos4release = [];
            let gmoUrl = (process.env.NODE_ENV === "prod") ? "https://p01.mul-pay.jp/payment/SearchTradeMulti.idPass" : "https://pt01.mul-pay.jp/payment/SearchTradeMulti.idPass";
            let promises = reservations.map((reservation) => {
                return new Promise((resolve, reject) => {
                    // GMO取引状態参照
                    this.logger.info('requesting... ');
                    request.post({
                        url: gmoUrl,
                        form: {
                            ShopID: conf.get('gmo_payment_shop_id'),
                            ShopPass: conf.get('gmo_payment_shop_password'),
                            OrderID: reservation.get('payment_no'),
                            PayType: reservation.get('payment_method')
                        }
                    }, (error, response, body) => {
                        this.logger.info('request processed.', error);
                        if (error)
                            return reject(error);
                        if (response.statusCode !== 200)
                            return reject(new Error(`statusCode is ${response.statusCode}`));
                        let searchTradeResult = querystring.parse(body);
                        // GMOにない、あるいは、UNPROCESSEDであれば離脱データ
                        if (searchTradeResult['ErrCode']) {
                            // M01-M01004002
                            // 指定されたオーダーIDの取引は登録されていません。
                            if (searchTradeResult['ErrCode'] === 'M01' && searchTradeResult['ErrInfo'] === 'M01004002') {
                                paymentNos4release.push(reservation.get('payment_no'));
                            }
                            resolve();
                        }
                        else {
                            if (searchTradeResult.Status === GMOUtil_1.default.STATUS_CVS_UNPROCESSED || searchTradeResult.Status === GMOUtil_1.default.STATUS_CREDIT_UNPROCESSED) {
                                paymentNos4release.push(reservation.get('payment_no'));
                            }
                            resolve();
                        }
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                if (paymentNos4release.length === 0) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                // 内部で確保する仕様の場合
                Models_1.default.Staff.findOne({
                    user_id: "2016sagyo2"
                }, (err, staff) => {
                    this.logger.info('staff found.', err, staff);
                    if (err) {
                        mongoose.disconnect();
                        process.exit(0);
                        return;
                    }
                    this.logger.info('updating reservations...');
                    Models_1.default.Reservation.update({
                        payment_no: { $in: paymentNos4release }
                    }, {
                        "status": ReservationUtil_1.default.STATUS_RESERVED,
                        "purchaser_group": ReservationUtil_1.default.PURCHASER_GROUP_STAFF,
                        "charge": 0,
                        "ticket_type_charge": 0,
                        "ticket_type_name_en": "Free",
                        "ticket_type_name_ja": "無料",
                        "ticket_type_code": "00",
                        "staff": staff.get('_id'),
                        "staff_user_id": staff.get('user_id'),
                        "staff_email": staff.get('email'),
                        "staff_name": staff.get('name'),
                        "staff_signature": "system",
                        "updated_user": "system",
                        // "purchased_at": Date.now(), // 購入日更新しない
                        "watcher_name_updated_at": null,
                        "watcher_name": ""
                    }, {
                        multi: true
                    }, (err, raw) => {
                        this.logger.info('updated.', err, raw);
                        mongoose.disconnect();
                        process.exit(0);
                    });
                });
            }).catch((err) => {
                this.logger.info('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
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
                            let title_ja;
                            let title_en;
                            switch (reservations[0].get('status')) {
                                case ReservationUtil_1.default.STATUS_RESERVED:
                                    // 1.5次販売はメールテンプレート別
                                    if (reservations[0].get('pre_customer')) {
                                        dir = `${process.cwd()}/apps/task/views/email/reserve/complete4preCustomer`;
                                        title_ja = '東京国際映画祭チケット 購入完了のお知らせ';
                                        title_en = 'Notice of Completion of TIFF Ticket Purchase';
                                    }
                                    else {
                                        dir = `${process.cwd()}/apps/task/views/email/reserve/complete`;
                                        title_ja = '東京国際映画祭チケット 購入完了のお知らせ';
                                        title_en = 'Notice of Completion of TIFF Ticket Purchase';
                                    }
                                    break;
                                case ReservationUtil_1.default.STATUS_WAITING_SETTLEMENT:
                                    // 1.5次販売はメールテンプレート別
                                    if (reservations[0].get('pre_customer')) {
                                        dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement4preCustomer`;
                                        title_ja = '東京国際映画祭チケット 仮予約完了のお知らせ';
                                        title_en = 'Notice of Completion of Tentative Reservation for TIFF Tickets';
                                    }
                                    else {
                                        dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement`;
                                        title_ja = '東京国際映画祭チケット 仮予約完了のお知らせ';
                                        title_en = 'Notice of Completion of Tentative Reservation for TIFF Tickets';
                                    }
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
                                title_ja: title_ja,
                                title_en: title_en,
                                reservations: reservations,
                                moment: moment,
                                numeral: numeral,
                                conf: conf,
                                GMOUtil: GMOUtil_1.default,
                                ReservationUtil: ReservationUtil_1.default
                            };
                            _logger.info('rendering template...dir:', dir);
                            template.render(locals, (err, result) => {
                                _logger.info('email template rendered.', err);
                                if (err)
                                    return resolve();
                                let email = new _sendgrid.Email({
                                    to: to,
                                    fromname: conf.get('email.fromname'),
                                    from: conf.get('email.from'),
                                    subject: `${(process.env.NODE_ENV !== 'prod') ? `[${process.env.NODE_ENV}]` : ''}${title_ja} ${title_en}`,
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
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationController;
