import BaseController from '../BaseController';
import Models from '../../../common/models/Models';
import ReservationUtil from '../../../common/models/Reservation/ReservationUtil';
import ReservationEmailCueUtil from '../../../common/models/ReservationEmailCue/ReservationEmailCueUtil';
import GMOUtil from '../../../common/Util/GMO/GMOUtil';
import mongodb = require('mongodb');
import mongoose = require('mongoose');
import conf = require('config');
import moment = require('moment');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');
let MONGOLAB_URI_FOR_GMO = conf.get<string>('mongolab_uri_for_gmo');

export default class GMOController extends BaseController {
    /**
     * GMO結果通知を10個ずつ処理する
     */
    public processNotifications(): void {
        mongoose.connect(MONGOLAB_URI, {});

        mongodb.MongoClient.connect(MONGOLAB_URI_FOR_GMO, (err, db) => {
            db.collection('gmo_notifications').find(
                {processed: false},
                {limit: 10}
            ).toArray((err, notifications) => {
                db.close();

                let promises = notifications.map((notification) => {
                    return new Promise((resolve, reject) => {
                        this.processOne(notification, () => {
                            resolve();
                        });

                    })
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
    public processOne(notification, cb: () => void): void {
        // 内容の整合性チェック
        this.logger.info('finding reservations...payment_no:', notification.order_id);
        Models.Reservation.find({
            payment_no: notification.order_id
        }, (err, reservations) => {
            this.logger.info('reservations found.', err, reservations.length);
            if (err) return this.next(notification, cb);
            if (reservations.length === 0) {
                notification.processed = true;
                return this.next(notification, cb);
            }

            // チェック文字列
            let shopPassString = GMOUtil.createShopPassString(
                notification.shop_id,
                notification.order_id,
                notification.amount,
                conf.get<string>('gmo_payment_shop_password'),
                moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss')
            );
            this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
            if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                // 不正な結果通知なので、処理済みにする
                notification.processed = true;
                return this.next(notification, cb);
            }




            // クレジットカード決済の場合
            if (notification.pay_type === GMOUtil.PAY_TYPE_CREDIT) {
                switch (notification.status) {
                    case GMOUtil.STATUS_CREDIT_CAPTURE:
                        // 予約完了ステータスへ変更
                        this.logger.info('updating reservations by paymentNo...', notification.order_id);
                        Models.Reservation.update(
                            {payment_no: notification.order_id},
                            {
                                status: ReservationUtil.STATUS_RESERVED,
                                updated_user: 'system'
                            },
                            {multi: true},
                            (err, raw) => {
                                this.logger.info('reservations updated.', err, raw);
                                if (err) return this.next(notification, cb);

                                // 完了メールキュー追加(あれば更新日時を更新するだけ)
                                this.logger.info('creating reservationEmailCue...');
                                Models.ReservationEmailCue.findOneAndUpdate({
                                    payment_no: notification.order_id,
                                    template: ReservationEmailCueUtil.TEMPLATE_COMPLETE,
                                }, {
                                    $set: { updated_at: Date.now() },
                                    $setOnInsert: { status: ReservationEmailCueUtil.STATUS_UNSENT }
                                }, {
                                    upsert: true,
                                    new: true
                                }, (err, cue) => {
                                    this.logger.info('reservationEmailCue created.', err, cue);
                                    if (err) return this.next(notification, cb);

                                    // あったにせよなかったにせよ処理済に
                                    notification.processed = true;
                                    this.next(notification, cb);
                                });
                            }
                        );

                        break;

                    case GMOUtil.STATUS_CREDIT_UNPROCESSED:
                        // 未決済の場合、放置
                        // ユーザーが「戻る」フローでキャンセルされる、あるいは、時間経過で空席になる
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    case GMOUtil.STATUS_CREDIT_AUTHENTICATED:
                    case GMOUtil.STATUS_CREDIT_CHECK:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    case GMOUtil.STATUS_CREDIT_AUTH:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    case GMOUtil.STATUS_CREDIT_SALES:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    case GMOUtil.STATUS_CREDIT_VOID: // 取消し
                        // 空席に戻さない(つくったけれども、連動しない方向で仕様決定)
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    case GMOUtil.STATUS_CREDIT_RETURN:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    case GMOUtil.STATUS_CREDIT_RETURNX:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    case GMOUtil.STATUS_CREDIT_SAUTH:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    default:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;
                }
            } else if (notification.pay_type === GMOUtil.PAY_TYPE_CVS) {


                switch (notification.status) {
                    case GMOUtil.STATUS_CVS_PAYSUCCESS:
                        // 予約完了ステータスへ変更
                        this.logger.info('updating reservations by paymentNo...', notification.order_id);
                        Models.Reservation.update(
                            {payment_no: notification.order_id},
                            {
                                status: ReservationUtil.STATUS_RESERVED,
                                updated_user: 'system'
                            },
                            {multi: true},
                            (err, raw) => {
                                this.logger.info('reservations updated.', err, raw);
                                if (err) return this.next(notification, cb);

                                // 完了メールキュー追加
                                this.logger.info('creating reservationEmailCue...');
                                Models.ReservationEmailCue.create({
                                    payment_no: notification.order_id,
                                    template: ReservationEmailCueUtil.TEMPLATE_COMPLETE,
                                    status: ReservationEmailCueUtil.STATUS_UNSENT
                                }, (err, cue) => {
                                    this.logger.info('reservationEmailCue created.', err, cue);
                                    if (err) return this.next(notification, cb);

                                    notification.processed = true;
                                    this.next(notification, cb);
                                });
                            }
                        );

                        break;

                    case GMOUtil.STATUS_CVS_REQSUCCESS:
                        // メールだけ送信
                        this.logger.info('creating reservationEmailCue...');
                        Models.ReservationEmailCue.create({
                            payment_no: notification.order_id,
                            template: ReservationEmailCueUtil.TEMPLATE_TEMPORARY,
                            status: ReservationEmailCueUtil.STATUS_UNSENT
                        }, (err, cue) => {
                            this.logger.info('reservationEmailCue created.', err, cue);
                            if (err) return this.next(notification, cb);

                            notification.processed = true;
                            this.next(notification, cb);
                        });

                        break;

                    case GMOUtil.STATUS_CVS_UNPROCESSED:
                        notification.processed = true;
                        this.next(notification, cb);
                        break;

                    case GMOUtil.STATUS_CVS_PAYFAIL: // 決済失敗
                    case GMOUtil.STATUS_CVS_EXPIRED: // 期限切れ
                    case GMOUtil.STATUS_CVS_CANCEL: // 支払い停止
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

            } else {
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
    private next(notification, cb: () => void): void {
        if (!notification.processed) return cb();

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
