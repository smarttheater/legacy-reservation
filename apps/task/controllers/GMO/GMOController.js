"use strict";
const BaseController_1 = require('../BaseController');
const Models_1 = require('../../../common/models/Models');
const ReservationUtil_1 = require('../../../common/models/Reservation/ReservationUtil');
const ReservationEmailCueUtil_1 = require('../../../common/models/ReservationEmailCue/ReservationEmailCueUtil');
const GMOUtil_1 = require('../../../common/Util/GMO/GMOUtil');
const mongodb = require('mongodb');
const mongoose = require('mongoose');
const conf = require('config');
const moment = require('moment');
let MONGOLAB_URI = conf.get('mongolab_uri');
let MONGOLAB_URI_FOR_GMO = conf.get('mongolab_uri_for_gmo');
class GMOController extends BaseController_1.default {
    /**
     * GMO結果通知を10個ずつ処理する
     */
    processNotifications() {
        mongoose.connect(MONGOLAB_URI, {});
        mongodb.MongoClient.connect(MONGOLAB_URI_FOR_GMO, (err, db) => {
            db.collection('gmo_notifications').find({ processed: false }, { limit: 10 }).toArray((err, notifications) => {
                db.close();
                let promises = notifications.map((notification) => {
                    return new Promise((resolve, reject) => {
                        this.processOne(notification, () => {
                            resolve();
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    mongoose.disconnect();
                    process.exit(0);
                }).catch((err) => {
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    /**
     * GMO結果通知を処理する
     */
    processOne(notification, cb) {
        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', notification.order_id);
        Models_1.default.Reservation.find({
            payment_no: notification.order_id
        }, (err, reservations) => {
            this.logger.info('reservations found.', err, reservations.length);
            if (err)
                return this.next(notification, cb);
            if (reservations.length === 0) {
                notification.processed = true;
                return this.next(notification, cb);
            }
            // チェック文字列
            let shopPassString = GMOUtil_1.default.createShopPassString(notification.shop_id, notification.order_id, notification.amount, conf.get('gmo_payment_shop_password'), moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss'));
            this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
            if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                // 不正な結果通知なので、処理済みにする
                notification.processed = true;
                return this.next(notification, cb);
            }
            // クレジットカード決済の場合
            if (notification.pay_type === GMOUtil_1.default.PAY_TYPE_CREDIT) {
                switch (notification.status) {
                    case GMOUtil_1.default.STATUS_CREDIT_CAPTURE:
                        // 予約完了ステータスへ変更
                        this.logger.info('updating reservations by paymentNo...', notification.order_id);
                        Models_1.default.Reservation.update({ payment_no: notification.order_id }, {
                            gmo_shop_id: notification.shop_id,
                            gmo_amount: notification.amount,
                            gmo_tax: notification.tax,
                            gmo_access_id: notification.access_id,
                            gmo_forward: notification.forward,
                            gmo_method: notification.method,
                            gmo_approve: notification.approve,
                            gmo_tran_id: notification.tran_id,
                            gmo_tran_date: notification.tran_date,
                            gmo_pay_type: notification.pay_type,
                            gmo_status: notification.status,
                            status: ReservationUtil_1.default.STATUS_RESERVED,
                            updated_user: 'system'
                        }, { multi: true }, (err, raw) => {
                            this.logger.info('reservations updated.', err, raw);
                            if (err)
                                return this.next(notification, cb);
                            // 完了メールキュー追加(あれば更新日時を更新するだけ)
                            this.logger.info('creating reservationEmailCue...');
                            Models_1.default.ReservationEmailCue.findOneAndUpdate({
                                payment_no: notification.order_id,
                                template: ReservationEmailCueUtil_1.default.TEMPLATE_COMPLETE,
                            }, {
                                $set: { updated_at: Date.now() },
                                $setOnInsert: { status: ReservationEmailCueUtil_1.default.STATUS_UNSENT }
                            }, {
                                upsert: true,
                                new: true
                            }, (err, cue) => {
                                this.logger.info('reservationEmailCue created.', err, cue);
                                if (err)
                                    return this.next(notification, cb);
                                // あったにせよなかったにせよ処理済に
                                notification.processed = true;
                                this.next(notification, cb);
                            });
                        });
                        break;
                    case GMOUtil_1.default.STATUS_CREDIT_UNPROCESSED:
                        // 未決済の場合、放置
                        // ユーザーが「戻る」フローでキャンセルされる、あるいは、時間経過で空席になる
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    case GMOUtil_1.default.STATUS_CREDIT_AUTHENTICATED:
                    case GMOUtil_1.default.STATUS_CREDIT_CHECK:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    case GMOUtil_1.default.STATUS_CREDIT_AUTH:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    case GMOUtil_1.default.STATUS_CREDIT_SALES:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    case GMOUtil_1.default.STATUS_CREDIT_VOID:
                        // 空席に戻さない(つくったけれども、連動しない方向で仕様決定)
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    case GMOUtil_1.default.STATUS_CREDIT_RETURN:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    case GMOUtil_1.default.STATUS_CREDIT_RETURNX:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    case GMOUtil_1.default.STATUS_CREDIT_SAUTH:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    default:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                }
            }
            else if (notification.pay_type === GMOUtil_1.default.PAY_TYPE_CVS) {
                switch (notification.status) {
                    case GMOUtil_1.default.STATUS_CVS_PAYSUCCESS:
                        // 予約完了ステータスへ変更
                        this.logger.info('updating reservations by paymentNo...', notification.order_id);
                        Models_1.default.Reservation.update({ payment_no: notification.order_id }, {
                            status: ReservationUtil_1.default.STATUS_RESERVED,
                            updated_user: 'system'
                        }, { multi: true }, (err, raw) => {
                            this.logger.info('reservations updated.', err, raw);
                            if (err)
                                return this.next(notification, cb);
                            // 完了メールキュー追加(あれば更新日時を更新するだけ)
                            this.logger.info('creating reservationEmailCue...');
                            Models_1.default.ReservationEmailCue.findOneAndUpdate({
                                payment_no: notification.order_id,
                                template: ReservationEmailCueUtil_1.default.TEMPLATE_COMPLETE,
                            }, {
                                $set: { updated_at: Date.now() },
                                $setOnInsert: { status: ReservationEmailCueUtil_1.default.STATUS_UNSENT }
                            }, {
                                upsert: true,
                                new: true
                            }, (err, cue) => {
                                this.logger.info('reservationEmailCue created.', err, cue);
                                if (err)
                                    return this.next(notification, cb);
                                // あったにせよなかったにせよ処理済に
                                notification.processed = true;
                                this.next(notification, cb);
                            });
                        });
                        break;
                    case GMOUtil_1.default.STATUS_CVS_REQSUCCESS:
                        // GMOパラメータを予約に追加
                        this.logger.info('updating reservations by paymentNo...', notification.order_id);
                        Models_1.default.Reservation.update({ payment_no: notification.order_id }, {
                            gmo_shop_id: notification.shop_id,
                            gmo_amount: notification.amount,
                            gmo_tax: notification.tax,
                            gmo_cvs_code: notification.cvs_code,
                            gmo_cvs_conf_no: notification.cvs_conf_no,
                            gmo_cvs_receipt_no: notification.cvs_receipt_no,
                            gmo_payment_term: notification.payment_term,
                            updated_user: 'system'
                        }, { multi: true }, (err, raw) => {
                            this.logger.info('reservations updated.', err, raw);
                            if (err)
                                return this.next(notification, cb);
                            // 仮予約完了メールキュー追加(あれば更新日時を更新するだけ)
                            this.logger.info('creating reservationEmailCue...');
                            Models_1.default.ReservationEmailCue.findOneAndUpdate({
                                payment_no: notification.order_id,
                                template: ReservationEmailCueUtil_1.default.TEMPLATE_TEMPORARY,
                            }, {
                                $set: { updated_at: Date.now() },
                                $setOnInsert: { status: ReservationEmailCueUtil_1.default.STATUS_UNSENT }
                            }, {
                                upsert: true,
                                new: true
                            }, (err, cue) => {
                                this.logger.info('reservationEmailCue created.', err, cue);
                                if (err)
                                    return this.next(notification, cb);
                                // あったにせよなかったにせよ処理済に
                                notification.processed = true;
                                this.next(notification, cb);
                            });
                        });
                        break;
                    case GMOUtil_1.default.STATUS_CVS_UNPROCESSED:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                    case GMOUtil_1.default.STATUS_CVS_PAYFAIL: // 決済失敗
                    case GMOUtil_1.default.STATUS_CVS_EXPIRED: // 期限切れ
                    case GMOUtil_1.default.STATUS_CVS_CANCEL:
                        // 空席に戻す
                        this.logger.info('removing reservations...payment_no:', notification.order_id);
                        let promises = reservations.map((reservation) => {
                            return new Promise((resolve, reject) => {
                                this.logger.info('removing reservation...', reservation.get('_id'));
                                reservation.remove((err) => {
                                    this.logger.info('reservation removed.', reservation.get('_id'), err);
                                    (err) ? reject(err) : resolve();
                                });
                            });
                        });
                        Promise.all(promises).then(() => {
                            // processedフラグをたてる
                            notification.processed = true;
                            this.next(notification, cb);
                        }, (err) => {
                            this.next(notification, cb);
                        });
                        break;
                    default:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                }
            }
            else {
                // 他の決済は本案件では非対応
                notification.processed = true;
                return this.next(notification, cb);
            }
        });
    }
    /**
     * プロセスを終了する
     *
     * @param {Object} notification
     */
    next(notification, cb) {
        if (!notification.processed)
            return cb();
        // processedフラグをたてる
        this.logger.info('saving notificaton...');
        let db4gmo = mongoose.createConnection(MONGOLAB_URI_FOR_GMO);
        notification.processed = true;
        db4gmo.collection('gmo_notifications').updateOne({
            _id: notification._id
        }, notification, (err) => {
            this.logger.info('notification saved.', err);
            db4gmo.close();
            cb();
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOController;
